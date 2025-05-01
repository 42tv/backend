import { IsNotEmpty, IsString } from 'class-validator';

export class PostBookmarkDto {
  @IsNotEmpty()
  @IsString()
  user_id: string;
}
