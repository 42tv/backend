import { Module } from '@nestjs/common';
import { CoinBalanceRepository } from './coin-balance.repository';
import { CoinBalanceService } from './coin-balance.service';
import { CoinBalanceController } from './coin-balance.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CoinBalanceController],
  providers: [CoinBalanceRepository, CoinBalanceService],
  exports: [CoinBalanceService, CoinBalanceRepository],
})
export class CoinBalanceModule {}
