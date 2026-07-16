import { Module, forwardRef } from '@nestjs/common';
import { CoinTopupRepository } from './coin-topup.repository';
import { CoinTopupService } from './coin-topup.service';
import { CoinTopupController } from './coin-topup.controller';
import { AdminCoinTopupController } from './admin-coin-topup.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductModule } from '../product/product.module';
import { PaymentModule } from '../payment/payment.module';
import { CoinBalanceModule } from '../coin-balance/coin-balance.module';
import { PayoutCoinModule } from '../payout-coin/payout-coin.module';
import { BootpayModule } from '../bootpay/bootpay.module';
import { AdminAuditLogModule } from '../admin-audit-log/admin-audit-log.module';

@Module({
  imports: [
    PrismaModule,
    ProductModule,
    forwardRef(() => PaymentModule),
    CoinBalanceModule,
    forwardRef(() => PayoutCoinModule),
    BootpayModule,
    AdminAuditLogModule,
  ],
  controllers: [CoinTopupController, AdminCoinTopupController],
  providers: [CoinTopupRepository, CoinTopupService],
  exports: [CoinTopupService, CoinTopupRepository],
})
export class CoinTopupModule {}
