import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ReportResolveAction,
  ReportStatus,
  ReportTargetType,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    reporter_idx: number;
    reported_idx: number;
    target_type: ReportTargetType;
    target_ref?: string | null;
    reason: string;
    evidence?: Prisma.InputJsonValue;
  }) {
    return await this.prisma.report.create({ data });
  }

  async findById(id: number) {
    return await this.prisma.report.findUnique({
      where: { id },
      include: {
        reporter: {
          select: { idx: true, user_id: true, nickname: true },
        },
        reported: {
          select: { idx: true, user_id: true, nickname: true },
        },
      },
    });
  }

  async findAll(options: {
    status?: ReportStatus;
    targetType?: ReportTargetType;
    reportedIdx?: number;
    limit: number;
    offset: number;
  }) {
    const where: Prisma.ReportWhereInput = {
      ...(options.status && { status: options.status }),
      ...(options.targetType && { target_type: options.targetType }),
      ...(options.reportedIdx && { reported_idx: options.reportedIdx }),
    };

    const [items, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: {
          reporter: {
            select: { idx: true, user_id: true, nickname: true },
          },
          reported: {
            select: { idx: true, user_id: true, nickname: true },
          },
        },
        orderBy: { created_at: 'desc' },
        take: options.limit,
        skip: options.offset,
      }),
      this.prisma.report.count({ where }),
    ]);
    return { items, total };
  }

  /**
   * 피신고자별 누적 신고 수 (기각 제외)
   */
  async countByReportedIdx(reportedIdxList: number[]) {
    if (reportedIdxList.length === 0) return new Map<number, number>();
    const grouped = await this.prisma.report.groupBy({
      by: ['reported_idx'],
      where: {
        reported_idx: { in: reportedIdxList },
        status: { not: ReportStatus.DISMISSED },
      },
      _count: { id: true },
    });
    return new Map(grouped.map((g) => [g.reported_idx, g._count.id]));
  }

  async resolve(
    id: number,
    data: {
      status: ReportStatus;
      resolve_action: ReportResolveAction;
      resolve_reason: string;
      resolved_by: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.report.update({
      where: { id },
      data: { ...data, resolved_at: new Date() },
    });
  }
}
