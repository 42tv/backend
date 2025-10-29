import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PayoutMaturityScheduler } from './payout-maturity.scheduler';
import { PayoutCoinModule } from '../payout-coin/payout-coin.module';

@Module({
  imports: [
    ScheduleModule.forRoot(), // NestJS 스케줄러 활성화
    PayoutCoinModule,
  ],
  providers: [PayoutMaturityScheduler],
  exports: [PayoutMaturityScheduler],
})
export class SchedulerModule {}
