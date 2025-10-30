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
   * @param tx 트랜잭션 클라이언트 (선택 - 없으면 자체 트랜잭션 생성)
   * @returns 사용 내역 목록
   */
  async useCoins(user_idx: number, useCoinDto: UseCoinDto, tx?: any) {
    const { amount, donation_id } = useCoinDto;

    if (amount <= 0) {
      throw new BadRequestException('사용할 코인은 0보다 커야 합니다.');
    }

    // 트랜잭션이 없으면 자체 생성, 있으면 그대로 사용
    if (tx) {
      return await this._useCoinsLogic(user_idx, amount, donation_id, tx);
    }

    return await this.prismaService.$transaction(async (tx) => {
      return await this._useCoinsLogic(user_idx, amount, donation_id, tx);
    });
  }

  /**
   * 코인 사용 내부 로직 (트랜잭션 내에서 실행)
   * @private
   */
  private async _useCoinsLogic(
    user_idx: number,
    amount: number,
    donation_id: string | null | undefined,
    tx: any,
  ) {
    // 1. 코인 잔액 확인 (트랜잭션 내부에서)
    const coinBalance = await this.coinBalanceService.getCoinBalance(
      user_idx,
      tx,
    );

    if (coinBalance.coin_balance < amount) {
      throw new BadRequestException('코인 잔액이 부족합니다.');
    }

    // 2. 사용 가능한 충전 내역 조회 (FIFO, 트랜잭션 내부에서)
    const availableTopups = await this.coinTopupService.getAvailableTopups(
      user_idx,
      tx,
    );

    if (availableTopups.length === 0) {
      throw new BadRequestException('사용 가능한 코인이 없습니다.');
    }

    // 3. 사용 가능한 총 코인량 계산 (미리 검증)
    const totalAvailableCoins = availableTopups.reduce(
      (sum, topup) => sum + topup.remaining_coins,
      0,
    );

    if (totalAvailableCoins < amount) {
      throw new BadRequestException(
        `사용 가능한 코인이 부족합니다. (필요: ${amount}, 사용 가능: ${totalAvailableCoins})`,
      );
    }

    // 4. FIFO 방식으로 코인 사용 처리 (검증 완료 후 실행)
    let remainingAmount = amount;
    const usageRecords = [];

    for (const topup of availableTopups) {
      if (remainingAmount <= 0) break;

      const availableCoins = topup.remaining_coins;
      const useFromThisTopup = Math.min(remainingAmount, availableCoins);

      // 4-1. CoinTopup의 remaining_coins 감소
      await tx.coinTopup.update({
        where: { id: topup.id },
        data: {
          remaining_coins: {
            decrement: useFromThisTopup,
          },
        },
      });

      // 4-2. 사용 내역 생성
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

    // 5. 지갑 잔액 차감
    await this.coinBalanceService.useCoins(user_idx, amount, tx);

    return usageRecords;
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
