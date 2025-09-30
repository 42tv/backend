import { Module, forwardRef } from '@nestjs/common';
import { CoinUsageRepository } from './coin-usage.repository';
import { CoinUsageService } from './coin-usage.service';
import { CoinUsageController } from './coin-usage.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CoinTopupModule } from '../coin-topup/coin-topup.module';
import { WalletBalanceModule } from '../wallet-balance/wallet-balance.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => CoinTopupModule),
    WalletBalanceModule,
  ],
  controllers: [CoinUsageController],
  providers: [CoinUsageRepository, CoinUsageService],
  exports: [CoinUsageService, CoinUsageRepository],
})
export class CoinUsageModule {}
