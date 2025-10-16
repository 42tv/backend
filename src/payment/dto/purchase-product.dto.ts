import { IsInt, IsPositive } from 'class-validator';

export class PurchaseProductDto {
  @IsInt()
  @IsPositive()
  product_id: number;
}
