import { Module } from '@nestjs/common';
import { PaymentTransactionRepository } from './payment-transaction.repository';
import { PaymentTransactionService } from './payment-transaction.service';
import { PaymentTransactionController } from './payment-transaction.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentTransactionController],
  providers: [PaymentTransactionRepository, PaymentTransactionService],
  exports: [PaymentTransactionService, PaymentTransactionRepository],
})
export class PaymentModule {}