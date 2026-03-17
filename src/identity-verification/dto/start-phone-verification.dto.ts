import { IsOptional, IsString } from 'class-validator';

export class StartPhoneVerificationDto {
  @IsString()
  @IsOptional()
  purpose?: string;
}
