import { Injectable } from '@nestjs/common';
import {
  SettlementAccountVerificationProvider,
  VerifySettlementAccountCommand,
  VerifySettlementAccountResult,
} from './account-verification-provider.interface';

@Injectable()
export class DevSettlementAccountVerificationProvider
  extends SettlementAccountVerificationProvider
{
  async verify(
    command: VerifySettlementAccountCommand,
  ): Promise<VerifySettlementAccountResult> {
    return {
      verified: true,
      provider_ref: `dev_${command.account_id}`,
      bank_code: command.bank_code,
      holder_name: command.holder_name,
    };
  }
}
