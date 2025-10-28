import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DonationRepository } from './donation.repository';
import { CoinUsageService } from '../coin-usage/coin-usage.service';
import { CoinBalanceService } from '../coin-balance/coin-balance.service';
import { PayoutCoinService } from '../payout-coin/payout-coin.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DonationService {
  constructor(
    private readonly donationRepository: DonationRepository,
    private readonly coinUsageService: CoinUsageService,
    private readonly coinBalanceService: CoinBalanceService,
    private readonly payoutCoinService: PayoutCoinService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 후원 생성
   * @param donorIdx 후원자 인덱스
   * @param streamerIdx 스트리머 인덱스
   * @param coinAmount 후원 코인량
   * @param message 후원 메시지 (선택)
   * @returns 생성된 Donation
   */
  async createDonation(
    donorIdx: number,
    streamerIdx: number,
    coinAmount: number,
    message?: string,
  ) {
    if (coinAmount <= 0) {
      throw new BadRequestException('Coin amount must be greater than 0');
    }

    if (donorIdx === streamerIdx) {
      throw new BadRequestException('Cannot donate to yourself');
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. 후원자의 코인 잔액 확인
      const donorBalance =
        await this.coinBalanceService.getCoinBalance(donorIdx);

      if (donorBalance.coin_balance < coinAmount) {
        throw new BadRequestException('Insufficient coin balance');
      }

      // 2. CoinUsage 생성 (FIFO - 후원자의 코인 사용)
      const coinUsages = await this.coinUsageService.useCoins(donorIdx, {
        amount: coinAmount,
        donation_id: null, // 아직 donation_id가 없으므로 나중에 연결
      });

      // 3. Donation 생성
      const donation = await this.donationRepository.create(
        {
          donor: {
            connect: { idx: donorIdx },
          },
          streamer: {
            connect: { idx: streamerIdx },
          },
          coin_amount: coinAmount,
          coin_value: coinAmount, // TODO: 실제 원화 가치 계산 필요
          message: message || null,
        },
        tx,
      );

      // 4. CoinUsage에 donation_id 연결
      await tx.coinUsage.updateMany({
        where: {
          id: {
            in: coinUsages.map((usage) => usage.id),
          },
        },
        data: {
          donation_id: donation.id,
        },
      });

      // 5. PayoutCoin 자동 생성 (스트리머가 받을 정산 코인)
      await this.payoutCoinService.createPayoutCoinsFromDonation(
        donation,
        coinUsages,
        tx,
      );

      // 6. 스트리머 CoinBalance.total_received 업데이트
      await this.coinBalanceService.receiveCoins(streamerIdx, coinAmount, tx);

      return donation;
    });
  }

  /**
   * Donation 상세 조회
   * @param id Donation ID
   * @returns Donation
   */
  async findById(id: string) {
    const donation = await this.donationRepository.findById(id);

    if (!donation) {
      throw new NotFoundException('Donation not found');
    }

    return donation;
  }

  /**
   * 스트리머가 받은 후원 목록 조회
   * @param streamerIdx 스트리머 인덱스
   * @param options 필터 옵션
   * @returns Donation 목록
   */
  async findReceivedByStreamerIdx(
    streamerIdx: number,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {
    return await this.donationRepository.findReceivedByStreamerIdx(
      streamerIdx,
      options,
    );
  }

  /**
   * 사용자가 보낸 후원 목록 조회
   * @param donorIdx 후원자 인덱스
   * @param options 필터 옵션
   * @returns Donation 목록
   */
  async findSentByDonorIdx(
    donorIdx: number,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {
    return await this.donationRepository.findSentByDonorIdx(donorIdx, options);
  }

  /**
   * 스트리머의 후원 통계 조회
   * @param streamerIdx 스트리머 인덱스
   * @param options 기간 옵션
   * @returns 후원 통계
   */
  async getReceivedStats(
    streamerIdx: number,
    options?: {
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    return await this.donationRepository.getReceivedStats(streamerIdx, options);
  }

  /**
   * 후원자별 통계 조회 (Top Donors)
   * @param streamerIdx 스트리머 인덱스
   * @param options 옵션
   * @returns 후원자별 통계
   */
  async getTopDonors(
    streamerIdx: number,
    options?: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    return await this.donationRepository.getTopDonors(streamerIdx, options);
  }
}
