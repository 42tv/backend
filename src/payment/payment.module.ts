import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentTransactionRepository } from './payment-transaction.repository';
import { BootpayTransactionRepository } from './bootpay-transaction.repository';
import { PaymentTransactionService } from './payment-transaction.service';
import { PaymentTransactionController } from './payment-transaction.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CoinTopupModule } from '../coin-topup/coin-topup.module';
import { ProductModule } from '../product/product.module';
import { UserModule } from '../user/user.module';
import { RealtimeRedisModule } from '../redis/redis.module';
import { PgProviderFactory } from './pg-providers/pg-provider.factory';
import { MockPgProvider } from './pg-providers/mock-provider.service';
import { BootpayProvider } from './pg-providers/bootpay-provider.service';
import { IdentityVerificationModule } from 'src/identity-verification/identity-verification.module';
import { IdentityVerifiedMemberGuard } from './guards/identity-verified-member.guard';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    IdentityVerificationModule,
    forwardRef(() => CoinTopupModule),
    ProductModule,
    UserModule,
    RealtimeRedisModule,
  ],
  controllers: [PaymentTransactionController],
  providers: [
    PaymentTransactionRepository,
    BootpayTransactionRepository,
    PaymentTransactionService,
    PgProviderFactory,
    MockPgProvider,
    BootpayProvider,
    IdentityVerifiedMemberGuard,
    // TODO: 실제 PG Provider 추가 시 여기에 등록
    // TossPgProvider,
    // InicisPgProvider,
    // KakaopayPgProvider,
  ],
  exports: [
    PaymentTransactionService,
    PaymentTransactionRepository,
    BootpayTransactionRepository,
  ],
})
export class PaymentModule {}
