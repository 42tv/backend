import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PayoutCoinRepository } from './payout-coin.repository';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PayoutStatus, TopupStatus } from '@prisma/client';

@Injectable()
export class PayoutCoinService {
  constructor(
    private readonly payoutCoinRepository: PayoutCoinRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Donation 생성 시 CoinUsage 기반으로 PayoutCoin 자동 생성
   * @param donation Donation 객체
   * @param coinUsages CoinUsage 배열
   * @param tx 트랜잭션 클라이언트
   * @returns 생성된 PayoutCoin 배열
   */
  async createPayoutCoinsFromDonation(
    donation: any,
    coinUsages: any[],
    tx: Prisma.TransactionClient,
  ) {
    const payoutCoins = [];

    // 각 CoinUsage마다 정확히 1개의 PayoutCoin 생성 (1:1 관계)
    for (const usage of coinUsages) {
      // CoinTopup 정보 조회 (coin_unit_price 필요)
      const topup = await tx.coinTopup.findUnique({
        where: { id: usage.topup_id },
      });

      if (!topup) {
        throw new NotFoundException(`CoinTopup not found: ${usage.topup_id}`);
      }

      // 3일 후 정산 가능 시각 계산
      const settlementReadyAt = new Date(donation.donated_at);
      settlementReadyAt.setDate(settlementReadyAt.getDate() + 3);

      // PayoutCoin 생성
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
          coin_value: Math.floor(usage.used_coins * topup.coin_unit_price),
          donated_at: donation.donated_at,
          settlement_ready_at: settlementReadyAt,
          status: PayoutStatus.PENDING,
        },
        tx,
      );

      payoutCoins.push(payoutCoin);
    }

    return payoutCoins;
  }

  /**
   * 정산 성숙도 업데이트 (스케줄러용)
   * settlement_ready_at이 현재보다 이전이고 status=PENDING인 PayoutCoin을
   * MATURED 또는 BLOCKED로 전환
   * @returns 처리된 PayoutCoin 수
   */
  async maturePendingCoins() {
    // settlement_ready_at <= now() && status = PENDING 조회
    const pendingCoins =
      await this.payoutCoinRepository.findPendingReadyCoins();

    let maturedCount = 0;
    let blockedCount = 0;

    for (const coin of pendingCoins) {
      // CoinTopup 상태 확인
      if (coin.topup.status === TopupStatus.FROZEN) {
        // FROZEN이면 PayoutCoin을 BLOCKED로 전환
        await this.payoutCoinRepository.updateStatus(
          coin.id,
          PayoutStatus.BLOCKED,
        );
        blockedCount++;
      } else {
        // 정상이면 MATURED로 전환
        await this.payoutCoinRepository.updateStatus(
          coin.id,
          PayoutStatus.MATURED,
        );
        maturedCount++;
      }
    }

    return {
      total: pendingCoins.length,
      matured: maturedCount,
      blocked: blockedCount,
    };
  }

  /**
   * CoinTopup이 FROZEN될 때 관련 PayoutCoin 차단
   * @param topupId CoinTopup ID
   * @param reason 차단 사유
   * @param tx 트랜잭션 클라이언트 (선택)
   * @returns 차단된 PayoutCoin 수
   */
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

  /**
   * 정산 대상 조회 (status=MATURED)
   * @param streamerIdx 스트리머 인덱스
   * @param options 필터 옵션
   * @returns MATURED 상태의 PayoutCoin 목록
   */
  async getMaturedCoinsForSettlement(
    streamerIdx: number,
    options?: {
      limit?: number;
      offset?: number;
    },
  ) {
    return await this.payoutCoinRepository.findMaturedCoins(
      streamerIdx,
      options,
    );
  }

  /**
   * 스트리머 정산 요약
   * @param streamerIdx 스트리머 인덱스
   * @returns 상태별 금액 합계
   */
  async getPayoutSummary(streamerIdx: number) {
    return await this.payoutCoinRepository.getPayoutSummary(streamerIdx);
  }

  /**
   * PayoutCoin 상세 조회
   * @param id PayoutCoin ID
   * @returns PayoutCoin 또는 null
   */
  async findById(id: string) {
    const payoutCoin = await this.payoutCoinRepository.findById(id);
    if (!payoutCoin) {
      throw new NotFoundException('PayoutCoin not found');
    }
    return payoutCoin;
  }

  /**
   * 스트리머의 PayoutCoin 목록 조회
   * @param streamerIdx 스트리머 인덱스
   * @param options 필터 옵션
   * @returns PayoutCoin 목록
   */
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

  /**
   * Donation ID로 PayoutCoin 조회
   * @param donationId Donation ID
   * @returns PayoutCoin 목록
   */
  async findByDonationId(donationId: string) {
    return await this.payoutCoinRepository.findByDonationId(donationId);
  }

  /**
   * 차단된 PayoutCoin 조회
   * @param streamerIdx 스트리머 인덱스
   * @returns BLOCKED 상태의 PayoutCoin 목록
   */
  async findBlockedCoins(streamerIdx: number) {
    return await this.payoutCoinRepository.findBlockedCoins(streamerIdx);
  }

  /**
   * 대기 중인 PayoutCoin 조회
   * @param streamerIdx 스트리머 인덱스
   * @returns PENDING 상태의 PayoutCoin 목록
   */
  async findPendingCoins(streamerIdx: number) {
    return await this.payoutCoinRepository.findPendingCoins(streamerIdx);
  }

  /**
   * 정산 가능 금액 조회
   * @param streamerIdx 스트리머 인덱스
   * @returns MATURED 상태의 총 금액
   */
  async getTotalMaturedAmount(streamerIdx: number) {
    return await this.payoutCoinRepository.getTotalMaturedAmount(streamerIdx);
  }

  /**
   * BLOCKED 상태의 PayoutCoin 해제 (관리자용)
   * @param id PayoutCoin ID
   * @returns 업데이트된 PayoutCoin
   */
  async unblockPayoutCoin(id: string) {
    const payoutCoin = await this.findById(id);

    if (payoutCoin.status !== PayoutStatus.BLOCKED) {
      throw new BadRequestException('PayoutCoin is not blocked');
    }

    // 3일이 지났으면 MATURED로, 아직이면 PENDING으로
    const now = new Date();
    const newStatus =
      payoutCoin.settlement_ready_at <= now
        ? PayoutStatus.MATURED
        : PayoutStatus.PENDING;

    return await this.payoutCoinRepository.updateStatus(id, newStatus);
  }
}
