import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { CoinUsageRepository } from './coin-usage.repository';
import { CoinTopupService } from '../coin-topup/coin-topup.service';
import { CoinBalanceService } from '../coin-balance/coin-balance.service';
import { PrismaService } from '../prisma/prisma.service';
import { UseCoinDto } from './dto/use-coin.dto';

@Injectable()
export class CoinUsageService {
  constructor(
    private readonly coinUsageRepository: CoinUsageRepository,
    @Inject(forwardRef(() => CoinTopupService))
    private readonly coinTopupService: CoinTopupService,
    private readonly coinBalanceService: CoinBalanceService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * 코인 사용 (FIFO 방식)
   * @param user_idx 사용자 ID
   * @param useCoinDto 코인 사용 정보
   * @returns 사용 내역 목록
   */
  async useCoins(user_idx: number, useCoinDto: UseCoinDto) {
    const { amount, donation_id } = useCoinDto;

    if (amount <= 0) {
      throw new BadRequestException('사용할 코인은 0보다 커야 합니다.');
    }

    return await this.prismaService.$transaction(async (tx) => {
      // 1. 코인 잔액 확인
      const coinBalance =
        await this.coinBalanceService.getCoinBalance(user_idx);

      if (coinBalance.coin_balance < amount) {
        throw new BadRequestException('코인 잔액이 부족합니다.');
      }

      // 2. 사용 가능한 충전 내역 조회 (FIFO)
      const availableTopups =
        await this.coinTopupService.getAvailableTopups(user_idx);

      if (availableTopups.length === 0) {
        throw new BadRequestException('사용 가능한 코인이 없습니다.');
      }

      let remainingAmount = amount;
      const usageRecords = [];

      // 3. FIFO 방식으로 코인 사용 처리
      for (const topup of availableTopups) {
        if (remainingAmount <= 0) break;

        const availableCoins = topup.remaining_coins;
        const useFromThisTopup = Math.min(remainingAmount, availableCoins);

        // 사용 내역 생성
        const usage = await this.coinUsageRepository.create(
          {
            topup_id: topup.id,
            used_coins: useFromThisTopup,
            donation_id,
          },
          tx,
        );

        usageRecords.push(usage);
        remainingAmount -= useFromThisTopup;
      }

      if (remainingAmount > 0) {
        throw new BadRequestException('사용 가능한 코인이 부족합니다.');
      }

      // 4. 지갑 잔액 차감
      await this.coinBalanceService.useCoins(user_idx, amount, tx);

      return usageRecords;
    });
  }

  /**
   * 사용자의 코인 사용 내역 조회
   * @param user_idx 사용자 ID
   * @param limit 조회 제한 수
   * @returns 사용 내역 목록
   */
  async getMyUsageHistory(user_idx: number, limit: number = 20) {
    return await this.coinUsageRepository.findByUserId(user_idx, limit);
  }

  /**
   * 사용자의 코인 사용 통계 조회
   * @param user_idx 사용자 ID
   * @returns 사용 통계
   */
  async getMyUsageStats(user_idx: number) {
    return await this.coinUsageRepository.getUsageStats(user_idx);
  }

  /**
   * 특정 충전 내역이 사용되었는지 확인 (환불 검증용)
   * @param topup_id 충전 내역 ID
   * @returns 사용된 코인 수
   */
  async getUsedCoinsFromTopup(topup_id: string) {
    return await this.coinUsageRepository.getTotalUsedCoins(topup_id);
  }
}
