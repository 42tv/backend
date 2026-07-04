import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BroadcastCategory } from '@prisma/client';
import { RedisService } from 'src/redis/redis.service';
import { RedisMessages } from 'src/redis/interfaces/message-namespace';
import { StreamService } from 'src/stream/stream.service';
import { UserService } from 'src/user/user.service';
import { BroadcastSettingService } from 'src/broadcast-setting/broadcast-setting.service';
import { AdminAuditLogService } from 'src/admin-audit-log/admin-audit-log.service';
import { LiveService } from './live.service';
import { KickViewerDto } from './dto/kick-viewer.dto';

@Injectable()
export class AdminLiveService {
  constructor(
    private readonly streamService: StreamService,
    private readonly redisService: RedisService,
    private readonly userService: UserService,
    private readonly broadcastSettingService: BroadcastSettingService,
    private readonly auditLogService: AdminAuditLogService,
    private readonly liveService: LiveService,
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
   * 방송 강제 종료 — NCP 종료 콜백과 동일한 정리 플로우를 관리자가 직접 트리거.
   * 시청자 키 정리 → Stream 삭제 → 전 서버에 종료 이벤트 전파
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
