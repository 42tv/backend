import { ReportTargetType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateReportDto {
  /** 피신고자 user_idx */
  @IsInt()
  reportedIdx: number;

  @IsEnum(ReportTargetType)
  targetType: ReportTargetType;

  /** 대상 참조 (stream_id, 게시글 id, 쪽지 id 등) */
  @IsOptional()
  @IsString()
  targetRef?: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  /** 증거 (채팅 로그, 스냅샷 URL 등) */
  @IsOptional()
  @IsObject()
  evidence?: Record<string, any>;
}
