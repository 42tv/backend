import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PayoutStatus } from '@prisma/client';

@Injectable()
export class PayoutCoinRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.PayoutCoinCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.payoutCoin.create({
      data,
    });
  }

  async createBatch(
    dataArray: Prisma.PayoutCoinCreateManyInput[],
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.payoutCoin.createMany({
      data: dataArray,
    });
  }

  async findById(id: string) {
    return await this.prisma.payoutCoin.findUnique({
      where: { id },
      include: {
        streamer: true,
        donation: true,
        usage: true,
        topup: true,
        settlement: true,
      },
    });
  }

  async findByStreamerIdx(
    streamerIdx: number,
    options?: {
      status?: PayoutStatus;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: Prisma.PayoutCoinWhereInput = {
      streamer_idx: streamerIdx,
    };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.startDate || options?.endDate) {
      where.donated_at = {};
      if (options.startDate) {
        where.donated_at.gte = options.startDate;
      }
      if (options.endDate) {
        where.donated_at.lte = options.endDate;
      }
    }

    const take = options?.limit || 50;
    const skip = options?.offset || 0;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.payoutCoin.findMany({
        where,
        include: {
          donation: true,
          topup: true,
          settlement: true,
        },
        orderBy: {
          donated_at: 'desc',
        },
        take,
        skip,
      }),
      this.prisma.payoutCoin.count({ where }),
    ]);

    return { items, total };
  }

  async findByDonationId(donationId: string) {
    return await this.prisma.payoutCoin.findMany({
      where: { donation_id: donationId },
      include: {
        usage: true,
        topup: true,
      },
    });
  }

  async findByTopupId(topupId: string) {
    return await this.prisma.payoutCoin.findMany({
      where: { topup_id: topupId },
      include: {
        donation: true,
        usage: true,
      },
    });
  }

  async findBySettlementId(settlementId: string) {
    return await this.prisma.payoutCoin.findMany({
      where: { settlement_id: settlementId },
      include: {
        donation: true,
        usage: true,
        topup: true,
      },
      orderBy: {
        donated_at: 'asc',
      },
    });
  }

  async findAvailableCoins(
    streamerIdx: number,
    options?: {
      limit?: number;
      offset?: number;
    },
  ) {
    const take = options?.limit || 100;
    const skip = options?.offset || 0;

    const where: Prisma.PayoutCoinWhereInput = {
      streamer_idx: streamerIdx,
      status: PayoutStatus.AVAILABLE,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.payoutCoin.findMany({
        where,
        include: {
          donation: true,
          topup: true,
        },
        orderBy: {
          settlement_ready_at: 'asc',
        },
        take,
        skip,
      }),
      this.prisma.payoutCoin.count({ where }),
    ]);

    return { items, total };
  }

  async findWaitingCoins(streamerIdx: number) {
    return await this.prisma.payoutCoin.findMany({
      where: {
        streamer_idx: streamerIdx,
        status: PayoutStatus.WAITING,
      },
      orderBy: {
        settlement_ready_at: 'asc',
      },
    });
  }

  async findBlockedCoins(streamerIdx: number) {
    return await this.prisma.payoutCoin.findMany({
      where: {
        streamer_idx: streamerIdx,
        status: PayoutStatus.BLOCKED,
      },
      include: {
        topup: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  /**
   * 정산 신청한 코인 수(targetCount)만큼 AVAILABLE 코인을 FIFO로 선택
   * @param targetCount 신청 코인 수 (원화가 아닌 코인 개수)
   * @returns 선택된 코인, 합산 원화(totalValue), 합산 코인 수(totalCount)
   */
  async findAvailableCoinsByAmount(streamerIdx: number, targetCount: number) {
    const coins = await this.prisma.payoutCoin.findMany({
      where: { streamer_idx: streamerIdx, status: PayoutStatus.AVAILABLE },
      orderBy: { settlement_ready_at: 'asc' },
    });

    const selected = [];
    let totalCount = 0;
    let totalValue = 0;

    for (const coin of coins) {
      if (totalCount + coin.coin_amount > targetCount) break;
      selected.push(coin);
      totalCount += coin.coin_amount;
      totalValue += coin.coin_value;
    }

    return { coins: selected, totalValue, totalCount };
  }

  async findWaitingReadyCoins() {
    return await this.prisma.payoutCoin.findMany({
      where: {
        status: PayoutStatus.WAITING,
        settlement_ready_at: {
          lte: new Date(),
        },
      },
      include: {
        topup: true,
      },
    });
  }

  async findAllWaitingCoins() {
    return await this.prisma.payoutCoin.findMany({
      where: {
        status: PayoutStatus.WAITING,
      },
      include: {
        topup: true,
      },
    });
  }

  async findByIds(ids: string[], tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return await client.payoutCoin.findMany({
      where: { id: { in: ids } },
    });
  }

  async updateStatus(
    id: string,
    status: PayoutStatus,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.payoutCoin.update({
      where: { id },
      data: {
        status,
        last_reviewed_at: new Date(),
      },
    });
  }

  async updateStatusBatch(
    ids: string[],
    status: PayoutStatus,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.payoutCoin.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        status,
        last_reviewed_at: new Date(),
      },
    });
  }

  async blockByTopupId(
    topupId: string,
    reason: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.payoutCoin.updateMany({
      where: {
        topup_id: topupId,
        status: {
          in: [PayoutStatus.WAITING, PayoutStatus.AVAILABLE],
        },
      },
      data: {
        status: PayoutStatus.BLOCKED,
        block_reason: 'TOPUP_FROZEN',
        blocked_topup_reason: reason,
        last_reviewed_at: new Date(),
      },
    });
  }

  async linkToSettlement(
    ids: string[],
    settlementId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.payoutCoin.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        settlement_id: settlementId,
      },
    });
  }

  async unlinkFromSettlement(ids: string[], tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return await client.payoutCoin.updateMany({
      where: { id: { in: ids } },
      data: { settlement_id: null },
    });
  }

  async getPayoutSummary(streamerIdx: number) {
    const [available, waiting, blocked, inSettlement, completed] =
      await Promise.all([
        this.prisma.payoutCoin.aggregate({
          where: { streamer_idx: streamerIdx, status: PayoutStatus.AVAILABLE },
          _sum: { coin_value: true },
        }),
        this.prisma.payoutCoin.aggregate({
          where: { streamer_idx: streamerIdx, status: PayoutStatus.WAITING },
          _sum: { coin_value: true },
        }),
        this.prisma.payoutCoin.aggregate({
          where: { streamer_idx: streamerIdx, status: PayoutStatus.BLOCKED },
          _sum: { coin_value: true },
        }),
        this.prisma.payoutCoin.aggregate({
          where: {
            streamer_idx: streamerIdx,
            status: PayoutStatus.IN_SETTLEMENT,
          },
          _sum: { coin_value: true },
        }),
        this.prisma.payoutCoin.aggregate({
          where: { streamer_idx: streamerIdx, status: PayoutStatus.COMPLETED },
          _sum: { coin_value: true },
        }),
      ]);

    return {
      available_amount: available._sum.coin_value || 0,
      waiting_amount: waiting._sum.coin_value || 0,
      blocked_amount: blocked._sum.coin_value || 0,
      in_settlement_amount: inSettlement._sum.coin_value || 0,
      completed_amount: completed._sum.coin_value || 0,
      total_received:
        (available._sum.coin_value || 0) +
        (waiting._sum.coin_value || 0) +
        (blocked._sum.coin_value || 0) +
        (inSettlement._sum.coin_value || 0) +
        (completed._sum.coin_value || 0),
    };
  }

  async getTotalAvailableAmount(streamerIdx: number) {
    const result = await this.prisma.payoutCoin.aggregate({
      where: {
        streamer_idx: streamerIdx,
        status: PayoutStatus.AVAILABLE,
      },
      _sum: {
        coin_value: true,
      },
    });

    return result._sum.coin_value || 0;
  }

  async findTopupById(topupId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return await client.coinTopup.findUnique({
      where: { id: topupId },
    });
  }
}
