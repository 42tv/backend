import { IsString } from 'class-validator';

export class ConfirmPhoneVerificationDto {
  @IsString()
  requestToken: string;
}
