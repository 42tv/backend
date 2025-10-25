import { IsInt, IsPositive, IsEnum, IsOptional } from 'class-validator';
import { PgProvider } from './create-payment-transaction.dto';

export class PurchaseProductDto {
  @IsInt()
  @IsPositive()
  product_id: number;

  @IsOptional()
  @IsEnum(PgProvider)
  pg_provider?: PgProvider;
}
