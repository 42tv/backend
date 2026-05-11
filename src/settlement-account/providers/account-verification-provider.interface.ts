export interface VerifySettlementAccountCommand {
  user_idx: number;
  account_id: string;
  bank_code: string;
  account_number: string;
  holder_name?: string;
}

export interface VerifySettlementAccountResult {
  verified: boolean;
  provider_ref?: string;
  holder_name?: string;
  bank_code?: string;
  failure_reason?: string;
}

export abstract class SettlementAccountVerificationProvider {
  abstract verify(
    command: VerifySettlementAccountCommand,
  ): Promise<VerifySettlementAccountResult>;
}
