import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TopupStatus } from '@prisma/client';
import {
  retentionDeadline,
  UserSnapshot,
} from '../common/utils/retention.util';

@Injectable()
export class CoinTopupRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 코인 충전 내역 생성
   * 거래 당시 사용자 스냅샷과 파기 예정 시각(거래일 + 5년)을 함께 기록
   * @param data 충전 데이터
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 생성된 충전 내역
   */
  async create(
    data: {
      transaction_id: string;
      bootpay_transaction_id?: string;
      user_idx: number;
      user_snapshot: UserSnapshot;
      product_id: number;
      product_name: string;
      base_coins: number;
      bonus_coins: number;
      total_coins: number;
      remaining_coins: number;
      paid_amount: number;
      coin_unit_price: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    return await prismaClient.coinTopup.create({
      data: {
        ...data,
        user_snapshot: { ...data.user_snapshot },
        should_delete_at: retentionDeadline(),
        status: TopupStatus.PENDING,
      },
    });
  }

  /**
   * 충전 내역 조회 (거래 ID로)
   * @param transaction_id 결제 거래 ID
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 충전 내역
   */
  async findByTransactionId(
    transaction_id: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.coinTopup.findFirst({
      where: { transaction_id },
      include: {
        transaction: true,
        user: true,
        product: true,
      },
    });
  }

  /**
   * 충전 내역 조회 (ID로)
   * @param id 충전 내역 ID
   * @returns 충전 내역
   */
  async findById(id: string) {
    return await this.prisma.coinTopup.findUnique({
      where: { id },
      include: {
        transaction: true,
        user: true,
        product: true,
        usages: true,
      },
    });
  }

  /**
   * 사용자의 충전 내역 조회
   * @param user_idx 사용자 ID
   * @param limit 조회 제한 수
   * @returns 충전 내역 목록
   */
  async findByUserId(user_idx: number, limit: number = 20) {
    return await this.prisma.coinTopup.findMany({
      where: { user_idx },
      orderBy: { topped_up_at: 'desc' },
      take: limit,
      include: {
        transaction: true,
        product: true,
      },
    });
  }

  /**
   * 사용자의 사용 가능한 충전 내역 조회 (FIFO용)
   * @param user_idx 사용자 ID
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 사용 가능한 충전 내역 (오래된 순)
   */
  async findAvailableTopupsForUser(
    user_idx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    // remaining_coins 컬럼 사용으로 성능 최적화 (JOIN 제거)
    return await prismaClient.coinTopup.findMany({
      where: {
        user_idx,
        status: TopupStatus.COMPLETED,
        remaining_coins: {
          gt: 0, // 남은 코인이 있는 것만
        },
      },
      orderBy: {
        topped_up_at: 'asc', // FIFO
      },
      select: {
        id: true,
        total_coins: true,
        remaining_coins: true,
        topped_up_at: true,
      },
    });
  }

  /**
   * 관리자용 충전 내역 목록 조회 (검색/상태 필터 + 페이지네이션)
   * @param options 조회 옵션
   * @returns 충전 내역 목록과 전체 개수
   */
  async findAllForAdmin(options: {
    status?: TopupStatus;
    search?: string;
    limit: number;
    offset: number;
  }) {
    const where: Prisma.CoinTopupWhereInput = {
      ...(options.status && { status: options.status }),
      ...(options.search && {
        user: {
          OR: [
            {
              user_id: {
                contains: options.search,
                mode: 'insensitive' as const,
              },
            },
            {
              nickname: {
                contains: options.search,
                mode: 'insensitive' as const,
              },
            },
          ],
        },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.coinTopup.findMany({
        where,
        include: {
          user: { select: { idx: true, user_id: true, nickname: true } },
        },
        orderBy: { topped_up_at: 'desc' },
        take: options.limit,
        skip: options.offset,
      }),
      this.prisma.coinTopup.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * 관리자 결제/정산 통계용 상태별 집계 조회
   * @returns CoinTopup/PayoutCoin/Settlement 상태별 groupBy 결과
   */
  async getAdminStats() {
    const [topupGroups, payoutGroups, settlementGroups] = await Promise.all([
      this.prisma.coinTopup.groupBy({
        by: ['status'],
        _sum: {
          paid_amount: true,
          total_coins: true,
          remaining_coins: true,
          refunded_coins: true,
          refunded_amount: true,
        },
        _count: { _all: true },
      }),
      this.prisma.payoutCoin.groupBy({
        by: ['status'],
        _sum: { coin_amount: true },
      }),
      this.prisma.settlement.groupBy({
        by: ['status'],
        _sum: { payout_amount: true },
        _count: { _all: true },
      }),
    ]);

    return { topupGroups, payoutGroups, settlementGroups };
  }

  /**
   * 환불 처리 (잔여 코인을 refunded_coins로 이관 + REFUNDED 상태 전환)
   * @param id 충전 내역 ID
   * @param refundedCoins 환불된 코인 수
   * @param refundedAmount 실제 환불 금액 (원)
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 업데이트된 충전 내역
   */
  async markRefunded(
    id: string,
    refundedCoins: number,
    refundedAmount: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    return await prismaClient.coinTopup.update({
      where: { id },
      data: {
        remaining_coins: 0,
        refunded_coins: refundedCoins,
        refunded_amount: refundedAmount,
        status: TopupStatus.REFUNDED,
      },
    });
  }

  /**
   * 충전 상태 업데이트
   * @param id 충전 내역 ID
   * @param status 새로운 상태
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 업데이트된 충전 내역
   */
  async updateStatus(
    id: string,
    status: TopupStatus,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    return await prismaClient.coinTopup.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * 완료된 충전 내역 통계 조회
   * @param user_idx 사용자 ID
   * @returns 충전 통계
   */
  async getTopupStats(user_idx: number) {
    const result = await this.prisma.coinTopup.aggregate({
      where: {
        user_idx,
        status: TopupStatus.COMPLETED,
      },
      _sum: {
        total_coins: true,
        paid_amount: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      total_topup_count: result._count.id || 0,
      total_coins_purchased: result._sum.total_coins || 0,
      total_amount_paid: result._sum.paid_amount || 0,
    };
  }
}
