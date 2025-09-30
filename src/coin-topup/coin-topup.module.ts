import { Module, forwardRef } from '@nestjs/common';
import { CoinTopupRepository } from './coin-topup.repository';
import { CoinTopupService } from './coin-topup.service';
import { CoinTopupController } from './coin-topup.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductModule } from '../product/product.module';
import { PaymentModule } from '../payment/payment.module';
import { WalletBalanceModule } from '../wallet-balance/wallet-balance.module';

@Module({
  imports: [
    PrismaModule,
    ProductModule,
    forwardRef(() => PaymentModule),
    WalletBalanceModule,
  ],
  controllers: [CoinTopupController],
  providers: [CoinTopupRepository, CoinTopupService],
  exports: [CoinTopupService, CoinTopupRepository],
})
export class CoinTopupModule {}
