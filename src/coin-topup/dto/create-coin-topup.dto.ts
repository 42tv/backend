import { IsNumber, IsString } from 'class-validator';

export class CreateCoinTopupDto {
  @IsNumber()
  product_id: number;

  @IsString()
  pg_transaction_id: string;
}

export class ProcessTopupDto {
  @IsString()
  transaction_id: string;

  @IsNumber()
  product_id: number;
}
