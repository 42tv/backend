import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AnswerInquiryDto {
  @IsString({ message: '답변은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '답변을 입력해주세요.' })
  @MaxLength(3000, { message: '답변은 3000자 이하여야 합니다.' })
  answer: string;
}
