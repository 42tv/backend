import { Module } from '@nestjs/common';
import { PayoutCoinService } from './payout-coin.service';
import { PayoutCoinRepository } from './payout-coin.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PayoutCoinService, PayoutCoinRepository],
  exports: [PayoutCoinService, PayoutCoinRepository],
})
export class PayoutCoinModule {}
