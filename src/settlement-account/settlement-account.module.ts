import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SettlementAccountController } from './settlement-account.controller';
import { SettlementAccountService } from './settlement-account.service';
import { SettlementAccountRepository } from './settlement-account.repository';

@Module({
  imports: [PrismaModule],
  controllers: [SettlementAccountController],
  providers: [SettlementAccountService, SettlementAccountRepository],
  exports: [SettlementAccountService, SettlementAccountRepository],
})
export class SettlementAccountModule {}
