import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class SendChatDto {
  @IsNumber()
  @IsNotEmpty()
  broadcaster_idx: number;

  @IsString()
  @IsNotEmpty()
  message: string;
}
