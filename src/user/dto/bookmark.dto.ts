import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, ArrayMinSize, IsNumber } from 'class-validator';

/**
 * 북마크 추가 요청 DTO
 */
export class AddBookmarkDto {
  @ApiProperty({
    description: '북마크할 사용자 ID',
    example: 'user123',
  })
  @IsNotEmpty()
  @IsString()
  user_id: string;
}

/**
 * 북마크 일괄 삭제 요청 DTO
 */
export class DeleteBookmarksDto {
  @ApiProperty({
    description: '삭제할 북마크 ID 배열',
    example: [1, 2, 3],
    type: [Number]
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  ids: number[];
}
