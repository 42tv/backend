import { IsInt, Min } from 'class-validator';

export class RequestSettlementDto {
  /** 신청 코인 수 (원화가 아닌 코인 개수) */
  @IsInt()
  @Min(1)
  amount: number;
}
