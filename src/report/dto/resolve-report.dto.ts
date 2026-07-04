import { ReportResolveAction } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class ResolveReportDto {
  @IsEnum(ReportResolveAction)
  action: ReportResolveAction;

  @IsString()
  @IsNotEmpty()
  reason: string;

  /** 제재 동반 액션(CHAT_BAN/SUSPEND)의 제재 기간(일). 없으면 영구 */
  @IsOptional()
  @IsInt()
  @IsPositive()
  days?: number;
}
