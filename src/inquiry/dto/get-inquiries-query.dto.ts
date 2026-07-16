import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import { InquiryStatus, InquiryType } from '@prisma/client';

export class GetInquiriesQueryDto {
  @IsOptional()
  @IsEnum(InquiryStatus, { message: '유효한 문의 상태가 아닙니다.' })
  status?: InquiryStatus;

  @IsOptional()
  @IsEnum(InquiryType, { message: '유효한 문의 유형이 아닙니다.' })
  type?: InquiryType;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page는 유효한 숫자여야 합니다.' })
  @IsPositive({ message: 'page는 1 이상의 값이어야 합니다.' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit은 유효한 숫자여야 합니다.' })
  @Min(1, { message: 'limit은 1 이상의 값이어야 합니다.' })
  @Max(100, { message: 'limit은 100 이하의 값이어야 합니다.' })
  limit?: number = 20;
}
