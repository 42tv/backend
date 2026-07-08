import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CoinBalanceModule } from 'src/coin-balance/coin-balance.module';
import { CoinUsageModule } from 'src/coin-usage/coin-usage.module';
import { UserModule } from 'src/user/user.module';
import { AdminAuditLogModule } from 'src/admin-audit-log/admin-audit-log.module';
import { AdminCoinService } from './admin-coin.service';
import { AdminCoinController } from './admin-coin.controller';

@Module({
  imports: [
    PrismaModule,
    CoinBalanceModule,
    CoinUsageModule,
    UserModule,
    AdminAuditLogModule,
  ],
  controllers: [AdminCoinController],
  providers: [AdminCoinService],
})
export class AdminCoinModule {}
