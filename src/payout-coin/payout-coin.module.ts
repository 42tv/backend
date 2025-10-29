import { Module } from '@nestjs/common';
import { PayoutCoinService } from './payout-coin.service';
import { PayoutCoinRepository } from './payout-coin.repository';
import { PayoutCoinController } from './payout-coin.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PayoutCoinController],
  providers: [PayoutCoinService, PayoutCoinRepository],
  exports: [PayoutCoinService, PayoutCoinRepository],
})
export class PayoutCoinModule {}
