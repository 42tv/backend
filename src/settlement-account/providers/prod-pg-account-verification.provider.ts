import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  SettlementAccountVerificationProvider,
  VerifySettlementAccountCommand,
  VerifySettlementAccountResult,
} from './account-verification-provider.interface';

@Injectable()
export class ProdPgSettlementAccountVerificationProvider extends SettlementAccountVerificationProvider {
  async verify(
    _command: VerifySettlementAccountCommand,
  ): Promise<VerifySettlementAccountResult> {
    throw new ServiceUnavailableException(
      '계좌 인증 서비스가 준비되지 않았습니다.',
    );
  }
}
