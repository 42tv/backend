import { SettlementAccountVerificationStatus } from '@prisma/client';

export class SettlementAccountResponseDto {
  id: string;
  bank_code: string;
  bank_name: string;
  account_number_masked: string;
  holder_name_masked: string | null;
  verification_status: SettlementAccountVerificationStatus;
  verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
