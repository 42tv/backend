import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { InquiryType } from '@prisma/client';

export class CreateInquiryDto {
  @IsEnum(InquiryType, { message: '유효한 문의 유형이 아닙니다.' })
  type: InquiryType;

  @IsString({ message: '제목은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '제목을 입력해주세요.' })
  @MaxLength(100, { message: '제목은 100자 이하여야 합니다.' })
  title: string;

  @IsString({ message: '내용은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '내용을 입력해주세요.' })
  @MaxLength(3000, { message: '내용은 3000자 이하여야 합니다.' })
  content: string;
}
