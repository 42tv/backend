import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TopupStatus } from '@prisma/client';

@Injectable()
export class CoinTopupRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 코인 충전 내역 생성
   * @param data 충전 데이터
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 생성된 충전 내역
   */
  async create(
    data: {
      transaction_id: string;
      user_idx: number;
      product_id: number;
      product_name: string;
      base_coins: number;
      bonus_coins: number;
      total_coins: number;
      paid_amount: number;
      coin_unit_price: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    return await prismaClient.coinTopup.create({
      data: {
        ...data,
        status: TopupStatus.PENDING,
      },
    });
  }

  /**
   * 충전 내역 조회 (거래 ID로)
   * @param transaction_id 결제 거래 ID
   * @returns 충전 내역
   */
  async findByTransactionId(transaction_id: string) {
    return await this.prisma.coinTopup.findFirst({
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
   * @returns 사용 가능한 충전 내역 (오래된 순)
   */
  async findAvailableTopupsForUser(user_idx: number) {
    const result = await this.prisma.$queryRaw<
      Array<{
        id: string;
        total_coins: number;
        topped_up_at: Date;
        remaining_coins: number;
      }>
    >`
      SELECT
        ct.id,
        ct.total_coins,
        ct.topped_up_at,
        (ct.total_coins - COALESCE(SUM(cu.used_coins), 0)) as remaining_coins
      FROM coin_topups ct
      LEFT JOIN coin_usages cu ON ct.id = cu.topup_id
      WHERE ct.user_idx = ${user_idx}
        AND ct.status = 'COMPLETED'
      GROUP BY ct.id, ct.total_coins, ct.topped_up_at
      HAVING (ct.total_coins - COALESCE(SUM(cu.used_coins), 0)) > 0
      ORDER BY ct.topped_up_at ASC
    `;

    return result;
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
   * 5년 보관을 위한 사용자 스냅샷 저장 (사용자 삭제 시)
   * @param topup_id 충전 내역 ID
   * @param user_snapshot 사용자 정보 스냅샷
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 업데이트된 충전 내역
   */
  async saveUserSnapshot(
    topup_id: string,
    user_snapshot: any,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    return await prismaClient.coinTopup.update({
      where: { id: topup_id },
      data: {
        deleted_user_snapshot: user_snapshot,
        user_deleted_at: new Date(),
      },
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
