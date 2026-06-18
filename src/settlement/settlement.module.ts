import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SettlementService } from './settlement.service';
import { SettlementRepository } from './settlement.repository';
import { SettlementController } from './settlement.controller';
import { AdminSettlementController } from './admin-settlement.controller';
import { PgPayoutService } from './pg-payout.service';
import { WithholdingReportService } from './withholding-report.service';
import { PayoutCoinModule } from '../payout-coin/payout-coin.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, PayoutCoinModule, ConfigModule],
  controllers: [SettlementController, AdminSettlementController],
  providers: [
    SettlementService,
    SettlementRepository,
    PgPayoutService,
    WithholdingReportService,
  ],
  exports: [SettlementService, SettlementRepository],
})
export class SettlementModule {}
