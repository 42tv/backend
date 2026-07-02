import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/redis/redis.service';
import { RedisMessages } from 'src/redis/interfaces/message-namespace';
import { StreamService } from 'src/stream/stream.service';
import { BroadcastSettingService } from 'src/broadcast-setting/broadcast-setting.service';
import { timeFormatter } from 'src/utils/utils';
import { NcpChannel } from '@prisma/client';
import { NcpChannelRepository } from '../ncp-channel.repository';
import { NcpEventService } from './ncp-event.service';
import { NcpCallbackDto } from '../dto/ncp-callback.dto';

/**
 * NCP 콜백(웹훅) 처리 — IvsService.handleCallbackStreamEvent 대응.
 * 방송 시작/종료 이벤트를 Stream 생성/시청자키 정리로 매핑한다.
 * (NcpEventService 는 얇은 API 클라이언트, 이 서비스는 비즈니스 매핑 담당)
 */
@Injectable()
export class NcpStreamEventService {
  private readonly logger = new Logger(NcpStreamEventService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly repo: NcpChannelRepository,
    private readonly eventService: NcpEventService,
    private readonly streamService: StreamService,
    private readonly broadcastSettingService: BroadcastSettingService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Global Callback URL 을 NCP 에 등록(1회성, 전 채널 공통).
   * 등록 URL 에 자체 시크릿을 쿼리로 심어 NcpWebhookGuard 가 검증한다.
   */
  async registerGlobalCallback(): Promise<string> {
    const callbackUrl = this.config.get<string>('NCP_CALLBACK_URL');
    const secret = this.config.get<string>('NCP_CALLBACK_SECRET');
    if (!callbackUrl || !secret) {
      throw new InternalServerErrorException(
        'NCP_CALLBACK_URL / NCP_CALLBACK_SECRET 환경변수가 없습니다.',
      );
    }
    const fullUrl = `${callbackUrl}?secret=${encodeURIComponent(secret)}`;
    await this.eventService.registerCallback({ callbackUrl: fullUrl });
    this.logger.log(`NCP Global Callback 등록: ${callbackUrl}`);
    return fullUrl;
  }

  /** 콜백 이벤트 처리 (방송 시작/종료) */
  async handleCallbackEvent(dto: NcpCallbackDto): Promise<void> {
    const ncp = await this.repo.findByChannelId(dto.channelId);
    if (!ncp) {
      throw new BadRequestException('채널이 존재하지 않습니다.');
    }

    if (dto.event === 'PUBLISH_START') {
      await this.streamStart(ncp, dto);
    } else if (dto.event === 'PUBLISH_END') {
      await this.streamStop(ncp);
    }
  }

  /**
   * 방송 종료 처리 — 시청자키를 정리하고 Stream 을 삭제해 라이브 리스트에서 제거한다.
   * 시청 중인 클라이언트에게는 Redis Pub/Sub 으로 종료 이벤트를 전파한다(멀티 서버 대응).
   * 멱등: 콜백 중복 수신/Stream 부재 시에도 안전하게 통과한다(중복 시 이벤트 재발행 없음).
   */
  private async streamStop(ncp: NcpChannel): Promise<void> {
    const userId = await this.repo.findUserId(ncp.user_idx);
    if (userId) {
      await this.redisService.removeViewerKey(userId);
    }

    const existing = await this.streamService.getStreamByUserIdx(ncp.user_idx);
    if (existing) {
      await this.streamService.deleteStream(existing.stream_id);

      if (userId) {
        await this.redisService.publishRoomMessage(
          `room:${userId}`,
          RedisMessages.streamEnd(userId),
        );
      }
    }
  }

  private async streamStart(
    ncp: NcpChannel,
    dto: NcpCallbackDto,
  ): Promise<void> {
    // 멱등: 콜백 중복 수신 대비, 이미 방송중이면 재생성하지 않는다
    const existing = await this.streamService.getStreamByUserIdx(ncp.user_idx);
    if (existing) return;

    const broadcastSetting =
      await this.broadcastSettingService.getBroadcastSetting(ncp.user_idx);
    if (!broadcastSetting) {
      throw new BadRequestException('방송 설정이 존재하지 않습니다.');
    }

    const startTime = timeFormatter(new Date(dto.timestamp).toISOString());
    // 썸네일은 채널 생성 시 확보한 NCP THUMBNAIL serviceUrl(720px)을 사용한다.
    // URL 은 고정이고 NCP 가 이미지를 주기적으로 갱신한다(구 Lambda+S3 방식 대체).
    const thumbnailUrl = ncp.thumbnail_url ?? '';

    await this.streamService.createStream(
      ncp.user_idx,
      thumbnailUrl,
      String(dto.id), // request_id
      dto.channelId, // stream_id (NCP는 streamId 미제공 → channelId 파생, 1유저 1채널)
      startTime,
      broadcastSetting.title,
    );
  }
}
