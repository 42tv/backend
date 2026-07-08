import { BannedWordAction } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateBannedWordDto {
  @IsString()
  @IsNotEmpty()
  word: string;

  @IsEnum(BannedWordAction)
  action: BannedWordAction;
}
