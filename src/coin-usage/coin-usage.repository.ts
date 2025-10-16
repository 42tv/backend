import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CoinUsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 코인 사용 내역 생성
   * @param data 사용 데이터
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 생성된 사용 내역
   */
  async create(
    data: {
      topup_id: string;
      used_coins: number;
      donation_id?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    return await prismaClient.coinUsage.create({
      data,
    });
  }

  /**
   * 사용자의 코인 사용 내역 조회
   * @param user_idx 사용자 ID
   * @param limit 조회 제한 수
   * @returns 사용 내역 목록
   */
  async findByUserId(user_idx: number, limit: number = 20) {
    return await this.prisma.coinUsage.findMany({
      where: {
        topup: {
          user_idx: user_idx,
        },
      },
      orderBy: { used_at: 'desc' },
      take: limit,
      include: {
        topup: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * 특정 충전 내역의 사용된 코인 총합 조회
   * @param topup_id 충전 내역 ID
   * @returns 사용된 코인 총합
   */
  async getTotalUsedCoins(topup_id: string) {
    const result = await this.prisma.coinUsage.aggregate({
      where: { topup_id },
      _sum: {
        used_coins: true,
      },
    });

    return result._sum.used_coins || 0;
  }

  /**
   * 사용자의 코인 사용 통계 조회
   * @param user_idx 사용자 ID
   * @returns 사용 통계
   */
  async getUsageStats(user_idx: number) {
    const result = await this.prisma.coinUsage.aggregate({
      where: {
        topup: {
          user_idx: user_idx,
        },
      },
      _sum: {
        used_coins: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      total_usage_count: result._count.id || 0,
      total_coins_used: result._sum.used_coins || 0,
    };
  }
}
