import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DonationRepository } from './donation.repository';
import { CoinUsageService } from '../coin-usage/coin-usage.service';
import { CoinBalanceService } from '../coin-balance/coin-balance.service';
import { PayoutCoinService } from '../payout-coin/payout-coin.service';
import { PrismaService } from '../prisma/prisma.service';
import { FanService } from '../fan/fan.service';
import { FanRepository } from '../fan/fan.repository';
import { RedisService } from '../redis/redis.service';
import { RedisMessages } from '../redis/interfaces/message-namespace';
import { UserService } from '../user/user.service';

@Injectable()
export class DonationService {
  constructor(
    private readonly donationRepository: DonationRepository,
    private readonly coinUsageService: CoinUsageService,
    private readonly coinBalanceService: CoinBalanceService,
    private readonly payoutCoinService: PayoutCoinService,
    private readonly prisma: PrismaService,
    private readonly fanService: FanService,
    private readonly fanRepository: FanRepository,
    @Inject(forwardRef(() => RedisService))
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
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
      // 1. 후원자의 코인 잔액 확인 (트랜잭션 내부에서)
      const donorBalance = await this.coinBalanceService.getCoinBalance(
        donorIdx,
        tx,
      );

      if (donorBalance.coin_balance < coinAmount) {
        throw new BadRequestException('Insufficient coin balance');
      }

      // 2. Donation 먼저 생성 (CoinUsage가 바로 참조할 수 있도록)
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

      // 3. CoinUsage 생성 (donation_id를 바로 전달 - UPDATE 불필요!)
      const coinUsages = await this.coinUsageService.useCoins(
        donorIdx,
        {
          amount: coinAmount,
          donation_id: donation.id, // ✅ 바로 연결!
        },
        tx,
      );

      // 4. PayoutCoin 자동 생성 (스트리머가 받을 정산 코인)
      await this.payoutCoinService.createPayoutCoinsFromDonation(
        donation,
        coinUsages,
        tx,
      );

      // 5. 스트리머 CoinBalance.total_received 업데이트
      await this.coinBalanceService.receiveCoins(streamerIdx, coinAmount, tx);

      // 6. 팬 관계 확인 및 생성/업데이트
      const fan = await this.fanRepository.findFan(donorIdx, streamerIdx, tx);
      if (!fan) {
        await this.fanRepository.createFanRelation(
          donorIdx,
          streamerIdx,
          coinAmount,
          tx,
        );
      } else {
        await this.fanRepository.updateTotalDonation(
          donorIdx,
          streamerIdx,
          coinAmount,
          tx,
        );
      }

      return donation;
    });
  }

  /**
   * 후원 생성 및 실시간 알림 발송 (user_id 기반)
   * @param donorIdx 후원자 인덱스
   * @param streamerUserId 스트리머 user_id
   * @param coinAmount 후원 코인량
   * @param message 후원 메시지 (선택)
   * @returns 생성된 Donation
   */
  async createDonationByUserId(
    donorIdx: number,
    streamerUserId: string,
    coinAmount: number,
    message?: string,
  ) {
    // 스트리머 조회
    const streamer = await this.userService.findByUserId(streamerUserId);

    if (!streamer) {
      throw new NotFoundException('존재하지 않는 사용자입니다');
    }

    return await this.createDonationWithNotification(
      donorIdx,
      streamer.idx,
      coinAmount,
      message,
    );
  }

  /**
   * 후원 생성 및 실시간 알림 발송 (idx 기반)
   * @param donorIdx 후원자 인덱스
   * @param streamerIdx 스트리머 인덱스
   * @param coinAmount 후원 코인량
   * @param message 후원 메시지 (선택)
   * @returns 생성된 Donation
   */
  async createDonationWithNotification(
    donorIdx: number,
    streamerIdx: number,
    coinAmount: number,
    message?: string,
  ) {
    const donation = await this.createDonation(
      donorIdx,
      streamerIdx,
      coinAmount,
      message,
    );

    // 8. 팬 레벨 계산
    const fanLevel = await this.fanService.matchFanLevel(donorIdx, streamerIdx);

    // 9. Redis Pub/Sub으로 실시간 알림 발송
    const donationMessage = RedisMessages.donation(
      streamerIdx.toString(),
      donation.id,
      donation.donor.idx,
      donation.donor.user_id,
      donation.donor.nickname,
      donation.donor.profile_img || '',
      donation.coin_amount,
      donation.coin_value,
      donation.message,
      donation.donated_at.toISOString(),
      fanLevel ? { name: fanLevel.name, color: fanLevel.color } : undefined,
    );

    // room:{broadcaster_id} 채널에 발행
    await this.redisService.publishRoomMessage(
      `room:${streamerIdx}`,
      donationMessage,
    );

    return donation;
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
