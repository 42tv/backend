import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminAuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 감사 로그 생성
   */
  async create(
    data: {
      admin_idx: number;
      action: string;
      target_type: string;
      target_id: string;
      reason?: string | null;
      detail?: Prisma.InputJsonValue;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.adminAuditLog.create({
      data: {
        admin_idx: data.admin_idx,
        action: data.action,
        target_type: data.target_type,
        target_id: data.target_id,
        reason: data.reason ?? null,
        detail: data.detail,
      },
    });
  }

  /**
   * 멱등성 키로 기존 로그 조회 (중복 실행 방지용)
   */
  async findByIdempotencyKey(action: string, idempotencyKey: string) {
    return await this.prisma.adminAuditLog.findFirst({
      where: {
        action,
        detail: {
          path: ['idempotency_key'],
          equals: idempotencyKey,
        },
      },
    });
  }

  /**
   * 감사 로그 목록 조회 (필터 + 페이징)
   */
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
    const where: Prisma.AdminAuditLogWhereInput = {
      ...(options.adminIdx && { admin_idx: options.adminIdx }),
      ...(options.action && { action: options.action }),
      ...(options.targetType && { target_type: options.targetType }),
      ...(options.targetId && { target_id: options.targetId }),
      ...((options.startDate || options.endDate) && {
        created_at: {
          ...(options.startDate && { gte: options.startDate }),
          ...(options.endDate && { lte: options.endDate }),
        },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: options.limit,
        skip: options.offset,
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);
    return { items, total };
  }
}
