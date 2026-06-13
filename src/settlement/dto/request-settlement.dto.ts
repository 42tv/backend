import { IsInt, Min } from 'class-validator';

export class RequestSettlementDto {
  @IsInt()
  @Min(1)
  amount: number;
}
