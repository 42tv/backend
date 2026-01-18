import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentTransactionRepository } from './payment-transaction.repository';
import { PaymentTransactionService } from './payment-transaction.service';
import { PaymentTransactionController } from './payment-transaction.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CoinTopupModule } from '../coin-topup/coin-topup.module';
import { ProductModule } from '../product/product.module';
import { UserModule } from '../user/user.module';
import { PgProviderFactory } from './pg-providers/pg-provider.factory';
import { MockPgProvider } from './pg-providers/mock-provider.service';
import { BootpayProvider } from './pg-providers/bootpay-provider.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    forwardRef(() => CoinTopupModule),
    ProductModule,
    UserModule,
  ],
  controllers: [PaymentTransactionController],
  providers: [
    PaymentTransactionRepository,
    PaymentTransactionService,
    PgProviderFactory,
    MockPgProvider,
    BootpayProvider,
    // TODO: 실제 PG Provider 추가 시 여기에 등록
    // TossPgProvider,
    // InicisPgProvider,
    // KakaopayPgProvider,
  ],
  exports: [PaymentTransactionService, PaymentTransactionRepository],
})
export class PaymentModule {}
