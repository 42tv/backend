import { Module } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { SettlementRepository } from './settlement.repository';
import { SettlementController } from './settlement.controller';
import { AdminSettlementController } from './admin-settlement.controller';
import { PayoutCoinModule } from '../payout-coin/payout-coin.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, PayoutCoinModule],
  controllers: [SettlementController, AdminSettlementController],
  providers: [SettlementService, SettlementRepository],
  exports: [SettlementService, SettlementRepository],
})
export class SettlementModule {}
