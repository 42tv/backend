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
   * 후원하기 (트랜잭션 처리 및 실시간 알림)
   * @param donorIdx 후원자 인덱스
   * @param streamerUserId 스트리머 user_id
   * @param coinAmount 후원 코인량
   * @param message 후원 메시지 (선택)
   * @returns 생성된 Donation
   */
  async donate(
    donorIdx: number,
    streamerUserId: string,
    coinAmount: number,
    message?: string,
  ) {
    // 1. 입력값 검증
    if (coinAmount <= 0) {
      throw new BadRequestException('Coin amount must be greater than 0');
    }

    // 2. 스트리머 조회
    const streamer = await this.userService.findByUserId(streamerUserId);
    if (!streamer) {
      throw new NotFoundException('존재하지 않는 사용자입니다');
    }

    const streamerIdx = streamer.idx;

    // 3. 자기 자신에게 후원 방지
    if (donorIdx === streamerIdx) {
      throw new BadRequestException('Cannot donate to yourself');
    }

    // 4. 트랜잭션 처리
    const { donation, isLevelUpgraded, oldLevel, updatedFan } =
      await this.prisma.$transaction(async (tx) => {
        // 4-1. 후원자의 코인 잔액 확인 (트랜잭션 내부에서)
        const donorBalance = await this.coinBalanceService.getCoinBalance(
          donorIdx,
          tx,
        );

        if (donorBalance.coin_balance < coinAmount) {
          throw new BadRequestException('Insufficient coin balance');
        }

        // 4-2. Donation 먼저 생성 (CoinUsage가 바로 참조할 수 있도록)
        const donation = await this.donationRepository.create(
          {
            donor: {
              connect: { idx: donorIdx },
            },
            streamer: {
              connect: { idx: streamerIdx },
            },
            coin_amount: coinAmount,
            coin_value: coinAmount,
            message: message || null,
          },
          tx,
        );

        // 4-3. CoinUsage 생성 (donation_id를 바로 전달 - UPDATE 불필요!)
        const coinUsages = await this.coinUsageService.useCoins(
          donorIdx,
          {
            amount: coinAmount,
            donation_id: donation.id, // ✅ 바로 연결!
          },
          tx,
        );

        // 4-4. PayoutCoin 자동 생성 (스트리머가 받을 정산 코인)
        await this.payoutCoinService.createPayoutCoinsFromDonation(
          donation,
          coinUsages,
          tx,
        );

        // 4-5. 스트리머 CoinBalance.total_received 업데이트
        await this.coinBalanceService.receiveCoins(streamerIdx, coinAmount, tx);

        // 4-6. 현재 Fan 정보 저장 (업그레이드 판단용)
        const fanBeforeDonation = await this.fanRepository.findFan(
          donorIdx,
          streamerIdx,
          tx,
        );
        const oldLevelId = fanBeforeDonation?.current_level_id || null;
        const oldLevel = fanBeforeDonation?.current_level
          ? {
              name: fanBeforeDonation.current_level.name,
              color: fanBeforeDonation.current_level.color,
            }
          : null;

        // 4-7. Fan의 total_donation 증가 (레벨은 아직 변경하지 않음)
        await this.updateFanTotalDonation(
          donorIdx,
          streamerIdx,
          coinAmount,
          tx,
        );

        // 4-8. 증가한 total_donation에 맞는 FanLevel 설정 및 최신 Fan 정보 반환
        const updatedFan = await this.updateCurrentLevel(
          donorIdx,
          streamerIdx,
          tx,
        );

        // 4-9. 팬 레벨 업그레이드 여부 판단 (oldLevelId와 현재 레벨 비교)
        const isLevelUpgraded =
          oldLevelId !== null && oldLevelId !== updatedFan.current_level_id;

        return { donation, isLevelUpgraded, oldLevel, updatedFan };
      });

    // 5. 업데이트된 Fan 정보에서 레벨 추출 (실시간 알림용)
    const fanLevel = {
      name: updatedFan.current_level.name,
      color: updatedFan.current_level.color,
    };

    // 6. Redis Pub/Sub으로 실시간 후원 알림 발송
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
      fanLevel,
    );

    // room:{broadcaster_id} 채널에 발행
    await this.redisService.publishRoomMessage(
      `room:${streamerIdx}`,
      donationMessage,
    );

    // 7. 레벨 업 알림 발송 (레벨이 업그레이드된 경우에만)
    if (isLevelUpgraded) {
      const levelUpMessage = RedisMessages.fanLevelUp(
        streamerIdx.toString(),
        donorIdx,
        donation.donor.user_id,
        donation.donor.nickname,
        donation.donor.profile_img || '',
        oldLevel,
        fanLevel,
        updatedFan.total_donation,
        donation.id,
        new Date().toISOString(),
      );

      await this.redisService.publishRoomMessage(
        `room:${streamerIdx}`,
        levelUpMessage,
      );
    }

    return donation;
  }

  /**
   * 1단계: Fan의 total_donation을 증가시킴
   * - Fan이 없으면 생성, 있으면 total_donation만 증가
   * - 레벨은 이 함수에서 변경하지 않음 (updateFanLevel에서 처리)
   * @param fanIdx 팬 인덱스
   * @param broadcasterIdx 스트리머 인덱스
   * @param donationAmount 후원 금액
   * @param tx 트랜잭션 클라이언트
   */
  private async updateFanTotalDonation(
    fanIdx: number,
    broadcasterIdx: number,
    donationAmount: number,
    tx: any,
  ): Promise<void> {
    const currentFan = await this.fanRepository.findFan(
      fanIdx,
      broadcasterIdx,
      tx,
    );

    if (!currentFan) {
      // Fan이 없는 경우: 생성 (초기 total_donation = donationAmount, 초기 레벨 설정)
      const initialLevel = await this.fanService.matchFanLevelByAmount(
        broadcasterIdx,
        donationAmount,
      );

      await this.fanRepository.createFanRelation(
        fanIdx,
        broadcasterIdx,
        donationAmount,
        initialLevel.id,
        tx,
      );
    } else {
      // Fan이 있는 경우: total_donation만 증가 (기존 레벨 유지, 다음 단계에서 변경됨)
      await this.fanRepository.updateTotalDonationAndLevel(
        fanIdx,
        broadcasterIdx,
        donationAmount,
        currentFan.current_level_id, // 기존 레벨 ID 유지
        tx,
      );
    }
  }

  /**
   * 2단계: 증가한 total_donation에 맞는 FanLevel을 설정
   * - 현재 total_donation을 기반으로 적절한 레벨 계산
   * - 레벨이 변경된 경우에만 current_level_id 업데이트
   * - 이 단계에서 팬 레벨이 올라갈 수 있음
   * @param fanIdx 팬 인덱스
   * @param broadcasterIdx 스트리머 인덱스
   * @param tx 트랜잭션 클라이언트
   * @returns 업데이트된 Fan 정보 (current_level 포함)
   */
  private async updateCurrentLevel(
    fanIdx: number,
    broadcasterIdx: number,
    tx: any,
  ): Promise<any> {
    const currentFan = await this.fanRepository.findFan(
      fanIdx,
      broadcasterIdx,
      tx,
    );

    if (!currentFan) {
      throw new Error('Fan 정보를 찾을 수 없습니다.');
    }

    // 현재 total_donation에 맞는 새로운 레벨 계산
    const newFanLevel = await this.fanService.matchFanLevelByAmount(
      broadcasterIdx,
      currentFan.total_donation,
    );

    // 레벨이 변경된 경우에만 current_level_id 업데이트
    if (currentFan.current_level_id !== newFanLevel.id) {
      const updatedFan = await this.fanRepository.updateCurrentLevel(
        fanIdx,
        broadcasterIdx,
        newFanLevel.id,
        tx,
      );
      return updatedFan;
    }

    // 레벨이 변경되지 않은 경우 현재 Fan 정보 반환
    return currentFan;
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
