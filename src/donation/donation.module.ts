import { Module, forwardRef } from '@nestjs/common';
import { DonationService } from './donation.service';
import { DonationRepository } from './donation.repository';
import { DonationController } from './donation.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CoinUsageModule } from '../coin-usage/coin-usage.module';
import { CoinBalanceModule } from '../coin-balance/coin-balance.module';
import { PayoutCoinModule } from '../payout-coin/payout-coin.module';
import { UserModule } from '../user/user.module';
import { FanModule } from '../fan/fan.module';
import { ChattingRedisModule } from '../redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => CoinUsageModule),
    CoinBalanceModule,
    forwardRef(() => PayoutCoinModule),
    forwardRef(() => UserModule),
    FanModule,
    forwardRef(() => ChattingRedisModule),
  ],
  controllers: [DonationController],
  providers: [DonationService, DonationRepository],
  exports: [DonationService, DonationRepository],
})
export class DonationModule {}
