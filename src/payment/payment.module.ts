import { Module, forwardRef } from '@nestjs/common';
import { PaymentTransactionRepository } from './payment-transaction.repository';
import { PaymentTransactionService } from './payment-transaction.service';
import { PaymentTransactionController } from './payment-transaction.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CoinTopupModule } from '../coin-topup/coin-topup.module';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [PrismaModule, forwardRef(() => CoinTopupModule), ProductModule],
  controllers: [PaymentTransactionController],
  providers: [PaymentTransactionRepository, PaymentTransactionService],
  exports: [PaymentTransactionService, PaymentTransactionRepository],
})
export class PaymentModule {}
