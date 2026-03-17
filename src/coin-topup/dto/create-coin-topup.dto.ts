import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ProcessTopupDto {
  @IsString()
  transaction_id: string;

  @IsNumber()
  product_id: number;

  @IsOptional()
  @IsString()
  bootpay_transaction_id?: string;
}
