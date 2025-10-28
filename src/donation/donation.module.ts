import { Module, forwardRef } from '@nestjs/common';
import { DonationService } from './donation.service';
import { DonationRepository } from './donation.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { CoinUsageModule } from '../coin-usage/coin-usage.module';
import { CoinBalanceModule } from '../coin-balance/coin-balance.module';
import { PayoutCoinModule } from '../payout-coin/payout-coin.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => CoinUsageModule),
    CoinBalanceModule,
    forwardRef(() => PayoutCoinModule),
  ],
  providers: [DonationService, DonationRepository],
  exports: [DonationService, DonationRepository],
})
export class DonationModule {}
