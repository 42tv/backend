import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PayoutCoinService } from '../payout-coin/payout-coin.service';

@Injectable()
export class PayoutMaturityScheduler {
  private readonly logger = new Logger(PayoutMaturityScheduler.name);

  constructor(private readonly payoutCoinService: PayoutCoinService) {}

  /**
   * PayoutCoin 성숙도 업데이트 (10분마다 실행)
   * settlement_ready_at이 현재보다 이전이고 status=PENDING인 PayoutCoin을
   * MATURED 또는 BLOCKED로 전환
   */
  // @Cron('0 */10 * * * *', {
  //   name: 'payout-maturity-update',
  //   timeZone: 'Asia/Seoul',
  // })
  // async updatePayoutMaturity() {
  //   this.logger.log('Starting PayoutCoin maturity update...');

  //   try {
  //     const result = await this.payoutCoinService.maturePendingCoins();

  //     this.logger.log(
  //       `PayoutCoin maturity update completed: ${JSON.stringify(result)}`,
  //     );
  //     this.logger.log(`  - Total processed: ${result.total}`);
  //     this.logger.log(`  - Matured: ${result.matured}`);
  //     this.logger.log(`  - Blocked: ${result.blocked}`);
  //   } catch (error) {
  //     this.logger.error('Failed to update PayoutCoin maturity', error.stack);
  //   }
  // }

  /**
   * 수동 실행 (테스트용)
   */
  async manualTrigger() {
    this.logger.log('Manual trigger: PayoutCoin maturity update');
    // await this.updatePayoutMaturity();
  }
}
