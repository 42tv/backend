import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SettlementAccountController } from './settlement-account.controller';
import { SettlementAccountService } from './settlement-account.service';
import { SettlementAccountRepository } from './settlement-account.repository';
import { SettlementAccountVerificationProvider } from './providers/account-verification-provider.interface';
import { DevSettlementAccountVerificationProvider } from './providers/dev-account-verification.provider';
import { ProdPgSettlementAccountVerificationProvider } from './providers/prod-pg-account-verification.provider';

const verificationProvider = {
  provide: SettlementAccountVerificationProvider,
  useClass:
    process.env.APP_ENV === 'prod'
      ? ProdPgSettlementAccountVerificationProvider
      : DevSettlementAccountVerificationProvider,
};

@Module({
  imports: [PrismaModule],
  controllers: [SettlementAccountController],
  providers: [
    SettlementAccountService,
    SettlementAccountRepository,
    DevSettlementAccountVerificationProvider,
    ProdPgSettlementAccountVerificationProvider,
    verificationProvider,
  ],
  exports: [SettlementAccountService, SettlementAccountRepository],
})
export class SettlementAccountModule {}
