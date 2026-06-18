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

    const take = options?.limit || 20;
    const skip = options?.offset || 0;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.settlement.findMany({
        where,
        include: {
          payoutCoins: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        take,
        skip,
      }),
      this.prisma.settlement.count({ where }),
    ]);

    return { items, total };
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

    const take = options?.limit || 50;
    const skip = options?.offset || 0;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.settlement.findMany({
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
        take,
        skip,
      }),
      this.prisma.settlement.count({ where }),
    ]);

    return { items, total };
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
  async approve(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return await client.settlement.update({
      where: { id },
      data: {
        status: SettlementStatus.APPROVED,
        approved_at: new Date(),
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
  async markAsPaid(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return await client.settlement.update({
      where: { id },
      data: {
        status: SettlementStatus.PAID,
        paid_at: new Date(),
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
  async reject(id: string, reason: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return await client.settlement.update({
      where: { id },
      data: {
        status: SettlementStatus.REJECTED,
        reject_reason: reason,
        rejected_at: new Date(),
      },
    });
  }

  /**
   * 스트리머의 사업자 유형 조회 (원천징수 대상 판정용)
   * @param streamerIdx 스트리머 인덱스
   * @param tx 트랜잭션 클라이언트 (선택)
   * @returns business_type 또는 null
   */
  async findStreamerBusinessType(
    streamerIdx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.user.findUnique({
      where: { idx: streamerIdx },
      select: { business_type: true },
    });
  }

  /**
   * 사용자 인덱스로 정산 계좌 조회 (삭제 포함)
   * @param userIdx 사용자 인덱스
   * @param tx 트랜잭션 클라이언트 (선택)
   * @returns SettlementAccount 또는 null
   */
  async findSettlementAccountByUserIdx(
    userIdx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.settlementAccount.findUnique({
      where: { user_idx: userIdx },
    });
  }

  /**
   * 정산 행위 감사 로그 생성
   * @param data 감사 로그 데이터
   * @param tx 트랜잭션 클라이언트 (선택)
   * @returns 생성된 감사 로그
   */
  async createAuditLog(
    data: Prisma.SettlementAuditLogUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.settlementAuditLog.create({ data });
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
   * 기간 내 PAID 정산의 원천세 합계 집계 (paid_at 기준)
   * @param start 시작 시각 (포함)
   * @param end 종료 시각 (미포함)
   * @returns 합계 및 지급 인원(중복 스트리머 제거)
   */
  async aggregateWithholdingByPeriod(start: Date, end: Date) {
    const where: Prisma.SettlementWhereInput = {
      status: SettlementStatus.PAID,
      paid_at: { gte: start, lt: end },
    };

    const [agg, personnel] = await Promise.all([
      this.prisma.settlement.aggregate({
        where,
        _sum: {
          tax_base: true,
          income_tax_amount: true,
          local_tax_amount: true,
          payout_amount: true,
        },
      }),
      this.prisma.settlement.findMany({
        where: { ...where, streamer_idx: { not: null } },
        distinct: ['streamer_idx'],
        select: { streamer_idx: true },
      }),
    ]);

    return { sum: agg._sum, personnel: personnel.length };
  }

  /**
   * 기간 내 PAID 정산을 스트리머별로 그룹핑해 원천세 합계 집계 (지급명세서용)
   * @param start 시작 시각 (포함)
   * @param end 종료 시각 (미포함)
   * @returns 스트리머별 합계
   */
  async groupWithholdingByStreamer(start: Date, end: Date) {
    return await this.prisma.settlement.groupBy({
      by: ['streamer_idx'],
      where: {
        status: SettlementStatus.PAID,
        paid_at: { gte: start, lt: end },
        streamer_idx: { not: null },
      },
      _sum: {
        tax_base: true,
        income_tax_amount: true,
        local_tax_amount: true,
        payout_amount: true,
      },
    });
  }

  /**
   * Settlement 수 조회
   * @param options 필터 옵션
   * @returns Settlement 수
   */
  async count(options?: { status?: SettlementStatus; streamerIdx?: number }) {
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
