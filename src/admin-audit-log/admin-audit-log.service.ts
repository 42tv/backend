import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdminAuditLogRepository } from './admin-audit-log.repository';

/**
 * 관리자 행위 통합 감사 로그.
 * 제재/환불/코인/개인정보 열람/계좌 검증 등 상태를 바꾸는 관리자 조작은
 * "누가/언제/무엇을/왜"를 이 서비스로 기록한다. (SettlementAuditLog 패턴의 전 영역 확장)
 */
@Injectable()
export class AdminAuditLogService {
  constructor(private readonly repository: AdminAuditLogRepository) {}

  async record(
    params: {
      adminIdx: number;
      action: string;
      targetType: string;
      targetId: string | number;
      reason?: string | null;
      detail?: Prisma.InputJsonValue;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return await this.repository.create(
      {
        admin_idx: params.adminIdx,
        action: params.action,
        target_type: params.targetType,
        target_id: String(params.targetId),
        reason: params.reason,
        detail: params.detail,
      },
      tx,
    );
  }

  async findByIdempotencyKey(action: string, idempotencyKey: string) {
    return await this.repository.findByIdempotencyKey(action, idempotencyKey);
  }

  async findAll(options: {
    adminIdx?: number;
    action?: string;
    targetType?: string;
    targetId?: string;
    startDate?: Date;
    endDate?: Date;
    limit: number;
    offset: number;
  }) {
    return await this.repository.findAll(options);
  }
}
