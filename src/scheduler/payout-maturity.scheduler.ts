import { Injectable, Logger } from '@nestjs/common';
import { PayoutCoinService } from '../payout-coin/payout-coin.service';

@Injectable()
export class PayoutMaturityScheduler {
  private readonly logger = new Logger(PayoutMaturityScheduler.name);

  constructor(private readonly payoutCoinService: PayoutCoinService) {}

  // @Cron('0 */10 * * * *', {
  //   name: 'payout-availability-update',
  //   timeZone: 'Asia/Seoul',
  // })
  // async updatePayoutAvailability() {
  //   this.logger.log('Starting PayoutCoin availability update...');

  //   try {
  //     const result = await this.payoutCoinService.updateWaitingCoinsToAvailable();

  //     this.logger.log(
  //       `PayoutCoin availability update completed: ${JSON.stringify(result)}`,
  //     );
  //     this.logger.log(`  - Total processed: ${result.total}`);
  //     this.logger.log(`  - Available: ${result.available}`);
  //     this.logger.log(`  - Blocked: ${result.blocked}`);
  //   } catch (error) {
  //     this.logger.error('Failed to update PayoutCoin availability', error.stack);
  //   }
  // }

  async manualTrigger() {
    this.logger.log('Manual trigger: PayoutCoin availability update');
    // await this.updatePayoutAvailability();
  }
}
