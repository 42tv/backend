import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SanctionStatus, SanctionType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { RedisMessages } from 'src/redis/interfaces/message-namespace';
import { StreamService } from 'src/stream/stream.service';
import { UserService } from 'src/user/user.service';
import { AdminAuditLogService } from 'src/admin-audit-log/admin-audit-log.service';
import { SanctionRepository } from './sanction.repository';
import { CreateSanctionDto } from './dto/create-sanction.dto';

@Injectable()
export class SanctionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: SanctionRepository,
    private readonly redisService: RedisService,
    private readonly streamService: StreamService,
    private readonly userService: UserService,
    private readonly auditLogService: AdminAuditLogService,
  ) {}

  /**
   * 제재 등록.
   * - 동일 유형의 활성 제재가 있으면 거부 (중복 실행 부작용 방지)
   * - idempotencyKey가 오면 기존 처리 결과를 재사용 (멱등성)
   * - 등록 후 실시간 전파: 세션 강제 종료(정지), 방송 강제 종료(방송 정지)
   */
  async createSanction(adminIdx: number, dto: CreateSanctionDto) {
    if (dto.idempotencyKey) {
      const existing = await this.auditLogService.findByIdempotencyKey(
        'SANCTION_CREATE',
        dto.idempotencyKey,
      );
      if (existing) {
        return await this.repository.findById(parseInt(existing.target_id, 10));
      }
    }

    const user = await this.userService.findByUserIdx(dto.userIdx);
    if (!user) {
      throw new NotFoundException('대상 유저를 찾을 수 없습니다.');
    }

    const activeSameType = await this.repository.findActiveByUser(
      dto.userIdx,
      dto.type,
    );
    if (dto.type !== SanctionType.WARNING && activeSameType.length > 0) {
      throw new BadRequestException(
        '동일 유형의 활성 제재가 이미 존재합니다. 기존 제재를 해제 후 다시 등록하세요.',
      );
    }

    const sanction = await this.prisma.$transaction(async (tx) => {
      const created = await this.repository.create(
        {
          user_idx: dto.userIdx,
          type: dto.type,
          reason: dto.reason,
          admin_idx: adminIdx,
        },
        tx,
      );
      await this.auditLogService.record(
        {
          adminIdx,
          action: 'SANCTION_CREATE',
          targetType: 'USER',
          targetId: created.id,
          reason: dto.reason,
          detail: {
            user_idx: dto.userIdx,
            type: dto.type,
            ...(dto.idempotencyKey && { idempotency_key: dto.idempotencyKey }),
          },
        },
        tx,
      );
      return created;
    });

    await this.propagateSanction(user, dto.type, dto.reason);

    return sanction;
  }

  /**
   * 제재 해제
   */
  async releaseSanction(sanctionId: number, adminIdx: number, reason: string) {
    const sanction = await this.repository.findById(sanctionId);
    if (!sanction) {
      throw new NotFoundException('제재 내역을 찾을 수 없습니다.');
    }
    if (sanction.status !== SanctionStatus.ACTIVE) {
      throw new BadRequestException('이미 해제된 제재입니다.');
    }

    const released = await this.prisma.$transaction(async (tx) => {
      const updated = await this.repository.release(
        sanctionId,
        adminIdx,
        reason,
        tx,
      );
      await this.auditLogService.record(
        {
          adminIdx,
          action: 'SANCTION_RELEASE',
          targetType: 'SANCTION',
          targetId: sanctionId,
          reason,
          detail: { user_idx: sanction.user_idx, type: sanction.type },
        },
        tx,
      );
      return updated;
    });

    return released;
  }

  /**
   * 제재 목록 조회
   */
  async findAll(options: {
    userIdx?: number;
    type?: SanctionType;
    status?: SanctionStatus;
    limit: number;
    offset: number;
  }) {
    const { items, total } = await this.repository.findAll(options);
    return {
      items: items.map((sanction) => ({
        ...sanction,
        is_active: sanction.status === SanctionStatus.ACTIVE,
      })),
      total,
    };
  }

  /**
   * 유저의 활성 제재 조회 (관리자 상세 화면 등에서 사용)
   */
  async findActiveByUser(userIdx: number, type?: SanctionType) {
    return await this.repository.findActiveByUser(userIdx, type);
  }

  /**
   * 제재 등록 후 실시간 전파 처리 (Redis Pub/Sub 경유, 전 서버 대상)
   */
  private async propagateSanction(
    user: { idx: number; user_id: string },
    type: SanctionType,
    reason: string,
  ) {
    if (type === SanctionType.ACCOUNT_SUSPEND) {
      // 활성 소켓 강제 종료 — 전 서버 전파
      await this.redisService.publishAdminCommand(
        RedisMessages.forceLogout(user.user_id, user.idx, reason),
      );
    }

    if (type === SanctionType.BROADCAST_BAN) {
      // 방송 중이면 강제 종료
      const stream = await this.streamService.getStreamByUserIdx(user.idx);
      if (stream) {
        await this.redisService.removeViewerKey(user.user_id);
        await this.streamService.deleteStream(stream.stream_id);
        await this.redisService.publishRoomMessage(
          `room:${user.user_id}`,
          RedisMessages.streamEnd(user.user_id),
        );
      }
    }
  }
}
