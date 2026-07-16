import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRefundRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  user_reason?: string;
}
