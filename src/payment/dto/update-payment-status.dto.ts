import { IsString, IsOptional } from 'class-validator';

export class UpdatePaymentStatusDto {
  @IsString()
  pg_transaction_id: string;

  @IsOptional()
  pg_response?: any;
}