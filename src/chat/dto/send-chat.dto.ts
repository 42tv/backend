import { IsNotEmpty, IsString } from 'class-validator';

export class SendChatDto {
  @IsString()
  @IsNotEmpty()
  broadcaster_id: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
