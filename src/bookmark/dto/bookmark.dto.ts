import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class BookmarkDto {
  @ApiProperty({
    description: '북마크할 사용자 ID',
    example: 'user123',
  })
  @IsNotEmpty()
  @IsString()
  user_id: string;
}
