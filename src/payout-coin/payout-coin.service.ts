import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PayoutCoinRepository } from './payout-coin.repository';
import { Prisma, PayoutStatus, TopupStatus } from '@prisma/client';

@Injectable()
export class PayoutCoinService {
  constructor(private readonly payoutCoinRepository: PayoutCoinRepository) {}

  async createPayoutCoinsFromDonation(
    donation: any,
    coinUsages: any[],
    tx: Prisma.TransactionClient,
  ) {
    const payoutCoins = [];

    for (const usage of coinUsages) {
      const settlementReadyAt = new Date(donation.donated_at);
      settlementReadyAt.setDate(settlementReadyAt.getDate() + 3);

      const payoutCoin = await this.payoutCoinRepository.create(
        {
          streamer: {
            connect: { idx: donation.streamer_idx },
          },
          donation: {
            connect: { id: donation.id },
          },
          usage: {
            connect: { id: usage.id },
          },
          topup: {
            connect: { id: usage.topup_id },
          },
          coin_amount: usage.used_coins,
          donated_at: donation.donated_at,
          settlement_ready_at: settlementReadyAt,
          status: PayoutStatus.WAITING,
        },
        tx,
      );

      payoutCoins.push(payoutCoin);
    }

    return payoutCoins;
  }

  async updateWaitingCoinsToAvailable() {
    const waitingCoins =
      await this.payoutCoinRepository.findWaitingReadyCoins();

    return await this.applyAvailabilityToWaitingCoins(waitingCoins);
  }

  async forceAllWaitingCoinsToAvailable() {
    const waitingCoins = await this.payoutCoinRepository.findAllWaitingCoins();

    return await this.applyAvailabilityToWaitingCoins(waitingCoins);
  }

  private async applyAvailabilityToWaitingCoins(
    waitingCoins: { id: string; topup: { status: TopupStatus } }[],
  ) {
    let availableCount = 0;
    let blockedCount = 0;

    for (const coin of waitingCoins) {
      if (coin.topup.status === TopupStatus.FROZEN) {
        await this.payoutCoinRepository.updateStatus(
          coin.id,
          PayoutStatus.BLOCKED,
        );
        blockedCount++;
      } else {
        await this.payoutCoinRepository.updateStatus(
          coin.id,
          PayoutStatus.AVAILABLE,
        );
        availableCount++;
      }
    }

    return {
      total: waitingCoins.length,
      available: availableCount,
      blocked: blockedCount,
    };
  }

  async blockPayoutCoinsByTopup(
    topupId: string,
    reason: string,
    tx?: Prisma.TransactionClient,
  ) {
    const result = await this.payoutCoinRepository.blockByTopupId(
      topupId,
      reason,
      tx,
    );

    return result.count;
  }

  async getAvailableCoinsForSettlement(
    streamerIdx: number,
    options?: {
      limit?: number;
      offset?: number;
    },
  ) {
    return await this.payoutCoinRepository.findAvailableCoins(
      streamerIdx,
      options,
    );
  }

  async getPayoutSummary(streamerIdx: number) {
    return await this.payoutCoinRepository.getPayoutSummary(streamerIdx);
  }

  async findById(id: string) {
    const payoutCoin = await this.payoutCoinRepository.findById(id);
    if (!payoutCoin) {
      throw new NotFoundException('PayoutCoin not found');
    }
    return payoutCoin;
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
    return await this.payoutCoinRepository.findByStreamerIdx(
      streamerIdx,
      options,
    );
  }

  async findByDonationId(donationId: string) {
    return await this.payoutCoinRepository.findByDonationId(donationId);
  }

  async findBlockedCoins(streamerIdx: number) {
    return await this.payoutCoinRepository.findBlockedCoins(streamerIdx);
  }

  async findWaitingCoins(streamerIdx: number) {
    return await this.payoutCoinRepository.findWaitingCoins(streamerIdx);
  }

  async unblockPayoutCoin(id: string) {
    const payoutCoin = await this.findById(id);

    if (payoutCoin.status !== PayoutStatus.BLOCKED) {
      throw new BadRequestException('PayoutCoin is not blocked');
    }

    const now = new Date();
    const newStatus =
      payoutCoin.settlement_ready_at <= now
        ? PayoutStatus.AVAILABLE
        : PayoutStatus.WAITING;

    return await this.payoutCoinRepository.updateStatus(id, newStatus);
  }
}
