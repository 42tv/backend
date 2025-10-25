import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WalletBalanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 사용자의 지갑 잔액 조회
   * @param user_idx 사용자 ID
   * @returns 지갑 잔액
   */
  async findByUserId(user_idx: number) {
    return await this.prisma.walletBalance.findUnique({
      where: { user_idx },
    });
  }

  /**
   * 지갑 잔액 생성 (User 생성 시 호출)
   * @param user_idx 사용자 ID
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 생성된 지갑 잔액
   */
  async create(user_idx: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;

    return await prismaClient.walletBalance.create({
      data: {
        user_idx,
        coin_balance: 0,
        total_charged: 0,
        total_used: 0,
        total_received: 0,
      },
    });
  }

  /**
   * 지갑 잔액 업데이트
   * @param user_idx 사용자 ID
   * @param balance 새로운 잔액
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 업데이트된 지갑 잔액
   */
  async updateBalance(
    user_idx: number,
    balance: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    return await prismaClient.walletBalance.update({
      where: { user_idx },
      data: { coin_balance: balance },
    });
  }

  /**
   * 지갑 잔액 증가 (충전 시)
   * @param user_idx 사용자 ID
   * @param amount 증가할 금액
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 업데이트된 지갑 잔액
   */
  async increaseBalance(
    user_idx: number,
    amount: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    return await prismaClient.walletBalance.update({
      where: { user_idx },
      data: {
        coin_balance: {
          increment: amount,
        },
        total_charged: {
          increment: amount,
        },
      },
    });
  }

  /**
   * 후원 받은 금액 증가 (스트리머)
   * @param user_idx 사용자 ID
   * @param amount 받은 금액
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 업데이트된 지갑 잔액
   */
  async increaseReceivedBalance(
    user_idx: number,
    amount: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    return await prismaClient.walletBalance.update({
      where: { user_idx },
      data: {
        coin_balance: {
          increment: amount,
        },
        total_received: {
          increment: amount,
        },
      },
    });
  }

  /**
   * 지갑 잔액 감소 (코인 사용 시)
   * @param user_idx 사용자 ID
   * @param amount 감소할 금액
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 업데이트된 지갑 잔액
   */
  async decreaseBalance(
    user_idx: number,
    amount: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    return await prismaClient.walletBalance.update({
      where: { user_idx },
      data: {
        coin_balance: {
          decrement: amount,
        },
        total_used: {
          increment: amount,
        },
      },
    });
  }

  /**
   * 사용자 삭제 시 지갑 정보 삭제
   * @param user_idx 사용자 ID
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 삭제된 지갑 잔액
   */
  async deleteByUserId(user_idx: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;

    return await prismaClient.walletBalance.delete({
      where: { user_idx },
    });
  }

  /**
   * 모든 사용자의 지갑 잔액 통계 (관리자용)
   * @returns 지갑 잔액 통계
   */
  async getWalletStats() {
    const result = await this.prisma.walletBalance.aggregate({
      _sum: {
        coin_balance: true,
        total_charged: true,
        total_used: true,
        total_received: true,
      },
      _avg: {
        coin_balance: true,
      },
      _count: {
        user_idx: true,
      },
    });

    return {
      total_users: result._count.user_idx || 0,
      total_balance: result._sum.coin_balance || 0,
      total_charged: result._sum.total_charged || 0,
      total_used: result._sum.total_used || 0,
      total_received: result._sum.total_received || 0,
      average_balance: result._avg.coin_balance || 0,
    };
  }
}
