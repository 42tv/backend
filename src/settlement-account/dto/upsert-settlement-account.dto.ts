import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpsertSettlementAccountDto {
  @IsString()
  @IsNotEmpty()
  bank_code: string;

  @IsString()
  @IsNotEmpty()
  bank_name: string;

  @IsString()
  @IsNotEmpty()
  account_number: string;

  @IsString()
  @IsOptional()
  holder_name?: string;
}
