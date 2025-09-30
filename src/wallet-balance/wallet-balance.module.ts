import { Module } from '@nestjs/common';
import { WalletBalanceRepository } from './wallet-balance.repository';
import { WalletBalanceService } from './wallet-balance.service';
import { WalletBalanceController } from './wallet-balance.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WalletBalanceController],
  providers: [WalletBalanceRepository, WalletBalanceService],
  exports: [WalletBalanceService, WalletBalanceRepository],
})
export class WalletBalanceModule {}
