import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/redis/redis.service';
import { NcpChannelService } from './ncp-channel.service';
import { NcpChannelRepository } from '../ncp-channel.repository';
import { ChannelInfo, ChannelStatus } from '../ncp-live-station.types';

export interface NcpBroadcastCredentials {
  channelId: string;
  streamKey: string;
  publishUrl: string;
  playbackUrl: string;
}

/** 채널이 살아있는 상태로 간주(재생성 불필요) */
const USABLE_STATUSES: ChannelStatus[] = [
  'READY',
  'PUBLISHING',
  'CREATING',
  'BLOCK',
];

const READY_POLL_MAX = 10;
const READY_POLL_INTERVAL_MS = 1000;

/**
 * NCP 채널 수명 관리 (30일 자동 회수 대응).
 *
 * 핵심: 방송 진입 시점마다 `ensureChannel` 이 NCP 실제 상태를 조회하고,
 * 없거나(404) 회수됐으면(DELETED/FORCE_DELETED) 재생성한 뒤 DB를 갱신한다.
 * → "미생성 유저"와 "회수된 유저"가 동일 경로로 처리된다.
 *
 * 참고: docs/ncp-live-station-channel-lifecycle.md
 */
@Injectable()
export class NcpChannelLifecycleService {
  private readonly logger = new Logger(NcpChannelLifecycleService.name);

  private readonly cdn: {
    cdnType: string;
    profileId: number;
    instanceNo: number;
    domain: string;
  };
  private readonly qualitySetId: number;
  /** 앱 실행 환경에 맞춘 NCP 채널 타입 (프로덕션=REAL, 그 외=DEV) */
  private readonly envType: 'REAL' | 'DEV';

  constructor(
    private readonly config: ConfigService,
    private readonly channel: NcpChannelService,
    private readonly repo: NcpChannelRepository,
    private readonly redis: RedisService,
  ) {
    this.cdn = {
      cdnType: this.config.get<string>('NCP_CDN_TYPE'),
      profileId: Number(this.config.get('NCP_CDN_PROFILE_ID')),
      instanceNo: Number(this.config.get('NCP_CDN_INSTANCE_NO')),
      domain: this.config.get<string>('NCP_CDN_DOMAIN'),
    };
    this.qualitySetId = Number(this.config.get('NCP_QUALITY_SET_ID'));
    this.envType =
      this.config.get<string>('NODE_ENV') === 'production' ? 'REAL' : 'DEV';
  }

  /**
   * 유저의 송출 채널이 살아있음을 보장하고 자격증명을 반환한다.
   * 방송 준비/방송설정 조회 등 방송자 진입점에서만 호출한다(시청 경로 호출 금지).
   */
  async ensureChannel(userIdx: number): Promise<NcpBroadcastCredentials> {
    const lockKey = `ncp:ensure:${userIdx}`;
    const locked = await this.redis.acquireLock(lockKey, 30);
    if (!locked) {
      throw new ConflictException(
        '채널 준비가 진행 중입니다. 잠시 후 다시 시도해주세요.',
      );
    }

    try {
      const existing = await this.repo.findByUserIdx(userIdx);

      if (existing) {
        const info = await this.fetchChannelInfo(existing.channel_id);

        if (info && USABLE_STATUSES.includes(info.channelStatus)) {
          if (info.channelStatus === 'BLOCK') {
            // 사용자 정지 상태 → 해제 후 사용
            await this.channel.enableChannel(existing.channel_id);
          }
          // 살아있는 채널 재사용 — 자격증명 최신화
          const refreshed = await this.repo.upsert(userIdx, {
            channel_id: existing.channel_id,
            stream_key: info.streamKey ?? existing.stream_key,
            publish_url: info.publishUrl ?? existing.publish_url,
            playback_url: existing.playback_url,
            thumbnail_url: existing.thumbnail_url,
            channel_status: info.channelStatus,
            name: existing.name,
          });
          return this.toCredentials(refreshed);
        }

        if (info && info.channelStatus === 'FORCE_BLOCK') {
          throw new ForbiddenException(
            '채널이 차단된 상태입니다. 관리자에게 문의해주세요.',
          );
        }
        // info 가 null(404) 이거나 DELETED/FORCE_DELETED → 아래에서 재생성
        this.logger.log(
          `채널 재생성 필요 (user_idx=${userIdx}, status=${info?.channelStatus ?? 'NOT_FOUND'})`,
        );
      }

      const created = await this.createAndPersist(userIdx);
      return this.toCredentials(created);
    } finally {
      await this.redis.releaseLock(lockKey);
    }
  }

  /**
   * 스트림키 재발급. NCP는 스트림키 단독 재발급 API가 없으므로
   * 기존 채널을 반납하고 새 채널을 생성한다(= 새 streamKey/송출URL/재생URL).
   * 방송 중(PUBLISHING)에는 거부한다(송출 끊김 방지).
   */
  async reissueChannel(userIdx: number): Promise<NcpBroadcastCredentials> {
    const lockKey = `ncp:ensure:${userIdx}`;
    const locked = await this.redis.acquireLock(lockKey, 30);
    if (!locked) {
      throw new ConflictException(
        '채널 준비가 진행 중입니다. 잠시 후 다시 시도해주세요.',
      );
    }

    try {
      const existing = await this.repo.findByUserIdx(userIdx);
      if (existing) {
        const info = await this.fetchChannelInfo(existing.channel_id);
        if (info?.channelStatus === 'PUBLISHING') {
          throw new BadRequestException(
            '방송 중에는 스트림키를 재발급할 수 없습니다.',
          );
        }
        if (info) {
          // 살아있는 기존 채널 반납 (새 채널로 교체). 이미 회수됐으면 생략.
          await this.safeDeleteChannel(existing.channel_id);
        }
      }
      const created = await this.createAndPersist(userIdx);
      return this.toCredentials(created);
    } finally {
      await this.redis.releaseLock(lockKey);
    }
  }

  private async safeDeleteChannel(channelId: string) {
    try {
      await this.channel.deleteChannel(channelId);
    } catch (e) {
      this.logger.warn(
        `기존 NCP 채널 반납 실패(무시) channelId=${channelId}: ${
          e instanceof Error ? e.message : e
        }`,
      );
    }
  }

  /**
   * 채널 정보 조회. 회수되어 존재하지 않으면(404/400) null 반환.
   * 그 외 오류는 그대로 전파(일시 오류로 잘못 재생성하지 않기 위함).
   */
  private async fetchChannelInfo(
    channelId: string,
  ): Promise<ChannelInfo | null> {
    try {
      const res = await this.channel.getChannel(channelId);
      return res.content;
    } catch (e) {
      if (e instanceof HttpException) {
        const status = e.getStatus();
        if (status === 404 || status === 400) return null;
      }
      throw e;
    }
  }

  /** 채널 생성(3콜) 후 DB 저장 */
  private async createAndPersist(userIdx: number) {
    this.assertChannelConfig();
    const channelName = await this.buildChannelName(userIdx);

    const createRes = await this.channel.createChannel({
      channelName,
      cdn: {
        createCdn: false,
        cdnType: this.cdn.cdnType,
        profileId: this.cdn.profileId,
        cdnInstanceNo: this.cdn.instanceNo,
        cdnDomain: this.cdn.domain,
        regionType: 'KOREA',
      },
      qualitySetId: this.qualitySetId,
      useDvr: false,
      record: { type: 'NO_RECORD' },
      drmEnabledYn: false,
      outputProtocol: 'LL_HLS',
      envType: this.envType,
    });

    const channelId = createRes.content.channelId;
    const info = await this.waitUntilReady(channelId);
    const playbackUrl = await this.fetchPlaybackUrl(channelId);
    const thumbnailUrl = await this.fetchThumbnailUrl(channelId);

    return this.repo.upsert(userIdx, {
      channel_id: channelId,
      stream_key: info.streamKey,
      publish_url: info.publishUrl,
      playback_url: playbackUrl,
      thumbnail_url: thumbnailUrl,
      channel_status: info.channelStatus,
      name: channelName,
    });
  }

  /**
   * 유저의 로그인 user_id 기반 채널명 생성.
   * NCP 규격(한글·영문·숫자·'_' 조합 3~20자)을 위해 허용 외 문자는 '_'로 치환 후 20자로 절단한다.
   * (OAuth 유저는 user_id가 이메일이라 '@', '.' 등이 섞이므로 치환된다)
   * user_id는 최소 4자로 보장되므로 별도 하한 폴백은 두지 않는다.
   */
  private async buildChannelName(userIdx: number): Promise<string> {
    const userId = await this.repo.findUserId(userIdx);
    return (userId ?? '').replace(/[^가-힣a-zA-Z0-9_]/g, '_').slice(0, 20);
  }

  /** CREATING → READY 까지 폴링하여 streamKey/publishUrl 확보 */
  private async waitUntilReady(channelId: string): Promise<ChannelInfo> {
    for (let i = 0; i < READY_POLL_MAX; i++) {
      const res = await this.channel.getChannel(channelId);
      const info = res.content;
      if (info.channelStatus !== 'CREATING' && info.streamKey) {
        return info;
      }
      await this.sleep(READY_POLL_INTERVAL_MS);
    }
    throw new InternalServerErrorException(
      'NCP 채널이 준비(READY)되지 않았습니다. 잠시 후 다시 시도해주세요.',
    );
  }

  /** serviceUrls(GENERAL) 의 첫 화질 재생 URL */
  private async fetchPlaybackUrl(channelId: string): Promise<string> {
    const res = await this.channel.getServiceUrls(channelId, 'GENERAL');
    return res.content?.[0]?.url ?? '';
  }

  /**
   * serviceUrls(THUMBNAIL) 의 720px 리사이즈 썸네일 URL.
   * TIMEMACHINE 과 달리 방송 전(READY)에도 조회 가능하므로 채널 생성 시 확보한다.
   * NCP 가 URL 뒤 이미지를 주기적으로 갱신하므로 URL 자체는 고정이다(구 Lambda+S3 대체).
   */
  private async fetchThumbnailUrl(channelId: string): Promise<string> {
    const res = await this.channel.getServiceUrls(channelId, 'THUMBNAIL');
    const thumbnail = res.content?.[0];
    const resized = thumbnail?.resizedUrl?.find((r) => r.type === '720px');
    return resized?.url ?? thumbnail?.url ?? '';
  }

  private toCredentials(row: {
    channel_id: string;
    stream_key: string;
    publish_url: string;
    playback_url: string;
  }): NcpBroadcastCredentials {
    return {
      channelId: row.channel_id,
      streamKey: row.stream_key,
      publishUrl: row.publish_url,
      playbackUrl: row.playback_url,
    };
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** 채널 생성에 필요한 환경변수 검증 (없으면 명확한 오류) */
  private assertChannelConfig() {
    const missing: string[] = [];
    if (!this.cdn.cdnType) missing.push('NCP_CDN_TYPE');
    if (!this.cdn.profileId || Number.isNaN(this.cdn.profileId))
      missing.push('NCP_CDN_PROFILE_ID');
    if (!this.cdn.instanceNo || Number.isNaN(this.cdn.instanceNo))
      missing.push('NCP_CDN_INSTANCE_NO');
    if (!this.cdn.domain) missing.push('NCP_CDN_DOMAIN');
    if (!this.qualitySetId || Number.isNaN(this.qualitySetId))
      missing.push('NCP_QUALITY_SET_ID');
    if (missing.length) {
      throw new InternalServerErrorException(
        `NCP 채널 생성에 필요한 환경변수가 없습니다: ${missing.join(', ')}`,
      );
    }
  }
}
