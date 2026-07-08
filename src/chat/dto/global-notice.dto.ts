import { IsNotEmpty, IsString } from 'class-validator';

export class GlobalNoticeDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}
