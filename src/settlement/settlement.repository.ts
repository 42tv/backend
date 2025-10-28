import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, SettlementStatus } from '@prisma/client';

@Injectable()
export class SettlementRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Settlement 생성
   * @param data Settlement 생성 데이터
   * @param tx 트랜잭션 클라이언트 (선택)
   * @returns 생성된 Settlement
   */
  async create(
    data: Prisma.SettlementCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.settlement.create({
      data,
    });
  }

  /**
   * ID로 Settlement 조회
   * @param id Settlement ID
   * @returns Settlement 또는 null
   */
  async findById(id: string) {
    return await this.prisma.settlement.findUnique({
      where: { id },
      include: {
        streamer: true,
        payoutCoins: {
          include: {
            donation: true,
            usage: true,
            topup: true,
          },
        },
      },
    });
  }

  /**
   * 스트리머의 Settlement 목록 조회
   * @param streamerIdx 스트리머 인덱스
   * @param options 필터 옵션 (status, 페이징 등)
   * @returns Settlement 목록
   */
  async findByStreamerIdx(
    streamerIdx: number,
    options?: {
      status?: SettlementStatus;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: Prisma.SettlementWhereInput = {
      streamer_idx: streamerIdx,
    };

    if (options?.status) {
      where.status = options.status;
    }

    return await this.prisma.settlement.findMany({
      where,
      include: {
        payoutCoins: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    });
  }

  /**
   * 승인 대기 중인 Settlement 목록 조회 (관리자용)
   * @returns PENDING 상태의 Settlement 목록
   */
  async findPendingSettlements() {
    return await this.prisma.settlement.findMany({
      where: {
        status: SettlementStatus.PENDING,
      },
      include: {
        streamer: {
          select: {
            idx: true,
            nickname: true,
            user_id: true,
          },
        },
        payoutCoins: true,
      },
      orderBy: {
        requested_at: 'asc',
      },
    });
  }

  /**
   * 모든 Settlement 조회 (관리자용)
   * @param options 필터 옵션
   * @returns Settlement 목록
   */
  async findAll(options?: {
    status?: SettlementStatus;
    streamerIdx?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.SettlementWhereInput = {};

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.streamerIdx) {
      where.streamer_idx = options.streamerIdx;
    }

    if (options?.startDate || options?.endDate) {
      where.requested_at = {};
      if (options.startDate) {
        where.requested_at.gte = options.startDate;
      }
      if (options.endDate) {
        where.requested_at.lte = options.endDate;
      }
    }

    return await this.prisma.settlement.findMany({
      where,
      include: {
        streamer: {
          select: {
            idx: true,
            nickname: true,
            user_id: true,
          },
        },
        payoutCoins: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  /**
   * Settlement 상태 업데이트
   * @param id Settlement ID
   * @param status 새로운 상태
   * @param additionalData 추가 업데이트 데이터
   * @param tx 트랜잭션 클라이언트 (선택)
   * @returns 업데이트된 Settlement
   */
  async updateStatus(
    id: string,
    status: SettlementStatus,
    additionalData?: Partial<Prisma.SettlementUpdateInput>,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.settlement.update({
      where: { id },
      data: {
        status,
        ...additionalData,
      },
    });
  }

  /**
   * Settlement 승인
   * @param id Settlement ID
   * @param approvedAt 승인 시각
   * @param tx 트랜잭션 클라이언트 (선택)
   * @returns 업데이트된 Settlement
   */
  async approve(
    id: string,
    approvedAt: Date,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.settlement.update({
      where: { id },
      data: {
        status: SettlementStatus.APPROVED,
        approved_at: approvedAt,
      },
    });
  }

  /**
   * Settlement 지급 완료 처리
   * @param id Settlement ID
   * @param paidAt 지급 시각
   * @param tx 트랜잭션 클라이언트 (선택)
   * @returns 업데이트된 Settlement
   */
  async markAsPaid(id: string, paidAt: Date, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return await client.settlement.update({
      where: { id },
      data: {
        status: SettlementStatus.PAID,
        paid_at: paidAt,
      },
    });
  }

  /**
   * Settlement 거절
   * @param id Settlement ID
   * @param reason 거절 사유
   * @param rejectedAt 거절 시각
   * @param tx 트랜잭션 클라이언트 (선택)
   * @returns 업데이트된 Settlement
   */
  async reject(
    id: string,
    reason: string,
    rejectedAt: Date,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.settlement.update({
      where: { id },
      data: {
        status: SettlementStatus.REJECTED,
        reject_reason: reason,
        rejected_at: rejectedAt,
      },
    });
  }

  /**
   * 스트리머의 Settlement 통계 조회
   * @param streamerIdx 스트리머 인덱스
   * @returns 정산 통계
   */
  async getSettlementStats(streamerIdx: number) {
    const [totalPaid, pending, approved] = await Promise.all([
      // 지급 완료된 총 금액
      this.prisma.settlement.aggregate({
        where: {
          streamer_idx: streamerIdx,
          status: SettlementStatus.PAID,
        },
        _sum: {
          payout_amount: true,
        },
        _count: true,
      }),
      // 대기 중인 정산
      this.prisma.settlement.aggregate({
        where: {
          streamer_idx: streamerIdx,
          status: SettlementStatus.PENDING,
        },
        _sum: {
          payout_amount: true,
        },
        _count: true,
      }),
      // 승인된 정산
      this.prisma.settlement.aggregate({
        where: {
          streamer_idx: streamerIdx,
          status: SettlementStatus.APPROVED,
        },
        _sum: {
          payout_amount: true,
        },
        _count: true,
      }),
    ]);

    return {
      total_paid_amount: totalPaid._sum.payout_amount || 0,
      total_paid_count: totalPaid._count,
      pending_amount: pending._sum.payout_amount || 0,
      pending_count: pending._count,
      approved_amount: approved._sum.payout_amount || 0,
      approved_count: approved._count,
    };
  }

  /**
   * Settlement 수 조회
   * @param options 필터 옵션
   * @returns Settlement 수
   */
  async count(options?: {
    status?: SettlementStatus;
    streamerIdx?: number;
  }) {
    const where: Prisma.SettlementWhereInput = {};

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.streamerIdx) {
      where.streamer_idx = options.streamerIdx;
    }

    return await this.prisma.settlement.count({ where });
  }
}
