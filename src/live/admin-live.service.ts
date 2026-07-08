import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BroadcastCategory } from '@prisma/client';
import { RedisService } from 'src/redis/redis.service';
import { RedisMessages } from 'src/redis/interfaces/message-namespace';
import { StreamService } from 'src/stream/stream.service';
import { UserService } from 'src/user/user.service';
import { BroadcastSettingService } from 'src/broadcast-setting/broadcast-setting.service';
import { AdminAuditLogService } from 'src/admin-audit-log/admin-audit-log.service';
import { NcpCurtainService } from 'src/ncp-live-station/services/ncp-curtain.service';
import { NcpChannelService } from 'src/ncp-live-station/services/ncp-channel.service';
import { NcpChannelRepository } from 'src/ncp-live-station/ncp-channel.repository';
import { LiveService } from './live.service';
import { KickViewerDto } from './dto/kick-viewer.dto';

// NCP 라이브 커튼 최대 유지 시간(분) — 1~10 범위 제약, 관리자 블라인드는 최대치 사용
const CURTAIN_INSERT_TIME_MIN = 10;

// 강제 종료 시 NCP 채널 재활성화까지의 지연(ms)
// — RTMP 세션이 완전히 끊길 시간을 확보한 뒤 채널을 원상 복구한다 (1회성 종료, 제재 아님)
const FORCE_END_CHANNEL_REOPEN_DELAY_MS = 10_000;

@Injectable()
export class AdminLiveService {
  private readonly logger = new Logger(AdminLiveService.name);

  constructor(
    private readonly streamService: StreamService,
    private readonly redisService: RedisService,
    private readonly userService: UserService,
    private readonly broadcastSettingService: BroadcastSettingService,
    private readonly auditLogService: AdminAuditLogService,
    private readonly liveService: LiveService,
    private readonly curtainService: NcpCurtainService,
    private readonly ncpChannelService: NcpChannelService,
    private readonly ncpChannelRepository: NcpChannelRepository,
    private readonly config: ConfigService,
  ) {}

  /**
   * 관리자용 전체 라이브 목록 — 비공개 방송 포함, playback_url·시청자 수 포함
   */
  async getAdminLiveList() {
    const lives = await this.streamService.getAdminLiveList();
    return await Promise.all(
      lives.map(async (live) => {
        const viewerCount = await this.redisService.getHashFieldCount(
          `viewer:${live.broadcaster.user_id}`,
        );
        return { ...live, viewerCount: viewerCount || 0 };
      }),
    );
  }

  /**
   * 방송 강제 종료 — NCP 채널 정지로 실제 ingest 를 끊고 정리 플로우를 트리거.
   * NCP 채널 정지(BLOCK) → 시청자 키 정리 → Stream 삭제 → 전 서버에 종료 이벤트 전파
   * 1회성 종료(제재 아님): 세션 절단 후 수초 뒤 채널을 자동 재활성화해
   * 방송자가 즉시 재송출할 수 있게 한다 (BROADCAST_BAN 과의 차이).
   */
  async forceEndBroadcast(
    adminIdx: number,
    broadcasterIdx: number,
    reason?: string,
  ) {
    const broadcaster = await this.userService.findByUserIdx(broadcasterIdx);
    if (!broadcaster) {
      throw new NotFoundException('방송자를 찾을 수 없습니다.');
    }

    const stream = await this.streamService.getStreamByUserIdx(broadcasterIdx);
    if (!stream) {
      throw new BadRequestException('현재 방송 중이 아닙니다.');
    }

    // NCP 채널 정지 (best-effort) — 송출 중인 RTMP 세션을 NCP 단에서 끊는다.
    // 실패해도 플랫폼 측 종료 처리는 계속 진행한다.
    const channel =
      await this.ncpChannelRepository.findByUserIdx(broadcasterIdx);
    if (channel) {
      try {
        await this.ncpChannelService.disableChannel(channel.channel_id);
        this.scheduleChannelReopen(channel.channel_id);
      } catch (e) {
        this.logger.warn(
          `강제 종료 시 NCP 채널 정지 실패 channelId=${channel.channel_id}: ${
            e instanceof Error ? e.message : e
          }`,
        );
      }
    }

    await this.redisService.removeViewerKey(broadcaster.user_id);
    await this.streamService.deleteStream(stream.stream_id);
    await this.redisService.publishRoomMessage(
      `room:${broadcaster.user_id}`,
      RedisMessages.streamEnd(broadcaster.user_id),
    );

    await this.auditLogService.record({
      adminIdx,
      action: 'LIVE_FORCE_END',
      targetType: 'LIVE',
      targetId: broadcasterIdx,
      reason,
      detail: { stream_id: stream.stream_id },
    });
  }

  /**
   * 강제 종료로 정지한 채널을 지연 후 재활성화 (best-effort).
   * 실패/서버 재시작으로 누락되면 방송 설정 조회 시 ensureChannel 이 해제한다.
   */
  private scheduleChannelReopen(channelId: string) {
    setTimeout(() => {
      void this.ncpChannelService.enableChannel(channelId).catch((e) => {
        this.logger.warn(
          `강제 종료 후 NCP 채널 재활성화 실패(ensureChannel이 복구) channelId=${channelId}: ${
            e instanceof Error ? e.message : e
          }`,
        );
      });
    }, FORCE_END_CHANNEL_REOPEN_DELAY_MS);
  }

  /**
   * 시청자 목록 조회 (관리자)
   */
  async getViewers(broadcasterIdx: number) {
    const broadcaster = await this.userService.findByUserIdx(broadcasterIdx);
    if (!broadcaster) {
      throw new NotFoundException('방송자를 찾을 수 없습니다.');
    }
    return await this.redisService.getViewersList(broadcaster.user_id);
  }

  /**
   * 시청자 강제 퇴장 (관리자) — 기존 kick 플로우 재사용 (관리자 권한 허용됨)
   */
  async kickViewer(
    adminIdx: number,
    broadcasterIdx: number,
    kickViewerDto: KickViewerDto,
  ) {
    const broadcaster = await this.userService.findByUserIdx(broadcasterIdx);
    if (!broadcaster) {
      throw new NotFoundException('방송자를 찾을 수 없습니다.');
    }
    const message = await this.liveService.kickViewer(
      adminIdx,
      broadcaster.user_id,
      kickViewerDto,
    );
    await this.auditLogService.record({
      adminIdx,
      action: 'LIVE_VIEWER_KICK',
      targetType: 'LIVE',
      targetId: broadcasterIdx,
      detail: { viewer_id: kickViewerDto.viewer_id },
    });
    return message;
  }

  /**
   * 방송별 관리자 공지 — 해당 방송 채팅방에만 시스템 메시지 전파
   * (전체 공지는 admin_command 채널, 방별 공지는 room:{user_id} 채널 경유)
   */
  async sendRoomNotice(
    adminIdx: number,
    broadcasterIdx: number,
    message: string,
  ) {
    const broadcaster = await this.requireLiveBroadcaster(broadcasterIdx);
    await this.redisService.publishRoomMessage(
      `room:${broadcaster.user_id}`,
      RedisMessages.roomNotice(broadcaster.user_id, message),
    );
    await this.auditLogService.record({
      adminIdx,
      action: 'CHAT_ROOM_NOTICE',
      targetType: 'CHAT',
      targetId: broadcasterIdx,
      detail: { message },
    });
  }

  /**
   * 블라인드(라이브 커튼) 시작 — 시청자 화면을 커튼 콘텐츠로 가림.
   * NCP 제약상 커튼 유지 시간은 최대 10분이며, 이후 자동으로 원 송출 화면으로 복귀한다.
   */
  async startCurtain(
    adminIdx: number,
    broadcasterIdx: number,
    reason?: string,
  ) {
    const channel = await this.requireLiveChannel(broadcasterIdx);
    const contentId = await this.resolveCurtainContentId();
    await this.curtainService.startCurtain(channel.channel_id, {
      contentId: [contentId],
      insertTime: CURTAIN_INSERT_TIME_MIN,
    });
    await this.auditLogService.record({
      adminIdx,
      action: 'LIVE_CURTAIN_START',
      targetType: 'LIVE',
      targetId: broadcasterIdx,
      reason,
      detail: { channel_id: channel.channel_id, content_id: contentId },
    });
  }

  /**
   * 블라인드(라이브 커튼) 해제 — 원 송출 화면으로 즉시 복귀
   */
  async stopCurtain(adminIdx: number, broadcasterIdx: number) {
    const channel = await this.requireLiveChannel(broadcasterIdx);
    await this.curtainService.stopCurtain(channel.channel_id);
    await this.auditLogService.record({
      adminIdx,
      action: 'LIVE_CURTAIN_STOP',
      targetType: 'LIVE',
      targetId: broadcasterIdx,
      detail: { channel_id: channel.channel_id },
    });
  }

  /**
   * 커튼 콘텐츠 ID 결정 — env(NCP_CURTAIN_CONTENT_ID) 우선,
   * 미설정 시 NCP에 등록된 첫 번째 커튼 콘텐츠 사용
   */
  private async resolveCurtainContentId(): Promise<number> {
    const fromEnv = this.config.get<string>('NCP_CURTAIN_CONTENT_ID');
    if (fromEnv) {
      return Number(fromEnv);
    }
    const res = await this.curtainService.listContents<{
      content?: { id: number; status: string }[];
    }>();
    const ready = res.content?.find((c) => c.status === 'READY');
    if (!ready) {
      throw new BadRequestException(
        '사용 가능한(READY) 커튼 콘텐츠가 없습니다. NCP 콘솔에서 커튼 콘텐츠를 등록하거나 NCP_CURTAIN_CONTENT_ID를 설정해주세요.',
      );
    }
    return ready.id;
  }

  /** 방송 중인 방송자 조회 (없으면 404/400) */
  private async requireLiveBroadcaster(broadcasterIdx: number) {
    const broadcaster = await this.userService.findByUserIdx(broadcasterIdx);
    if (!broadcaster) {
      throw new NotFoundException('방송자를 찾을 수 없습니다.');
    }
    const stream = await this.streamService.getStreamByUserIdx(broadcasterIdx);
    if (!stream) {
      throw new BadRequestException('현재 방송 중이 아닙니다.');
    }
    return broadcaster;
  }

  /** 방송 중인 방송자의 NCP 채널 조회 (없으면 404/400) */
  private async requireLiveChannel(broadcasterIdx: number) {
    await this.requireLiveBroadcaster(broadcasterIdx);
    const channel =
      await this.ncpChannelRepository.findByUserIdx(broadcasterIdx);
    if (!channel) {
      throw new NotFoundException('방송자의 NCP 채널을 찾을 수 없습니다.');
    }
    return channel;
  }

  /**
   * 카테고리 강제 변경 (성인 콘텐츠의 일반 카테고리 송출 대응)
   */
  async forceUpdateCategory(
    adminIdx: number,
    broadcasterIdx: number,
    category: BroadcastCategory,
    reason?: string,
  ) {
    const setting =
      await this.broadcastSettingService.getBroadcastSetting(broadcasterIdx);
    if (!setting) {
      throw new NotFoundException('방송 설정을 찾을 수 없습니다.');
    }
    const updated = await this.broadcastSettingService.updateCategory(
      broadcasterIdx,
      category,
    );
    await this.auditLogService.record({
      adminIdx,
      action: 'LIVE_CATEGORY_FORCE_UPDATE',
      targetType: 'LIVE',
      targetId: broadcasterIdx,
      reason,
      detail: { before: setting.category, after: category },
    });
    return updated;
  }
}
