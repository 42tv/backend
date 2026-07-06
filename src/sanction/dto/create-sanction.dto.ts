import { SanctionType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSanctionDto {
  @IsInt()
  userIdx: number;

  @IsEnum(SanctionType)
  type: SanctionType;

  @IsString()
  @IsNotEmpty()
  reason: string;

  /** 중복 실행 방지용 멱등성 키 (선택) */
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
