import { SanctionType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateSanctionDto {
  @IsInt()
  userIdx: number;

  @IsEnum(SanctionType)
  type: SanctionType;

  /** 제재 기간(일). 없으면 영구 */
  @IsOptional()
  @IsInt()
  @IsPositive()
  days?: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  /** 중복 실행 방지용 멱등성 키 (선택) */
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
