import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class AdminCoinAdjustDto {
  @IsInt()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  /** 중복 실행 방지용 멱등성 키 (선택) */
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
