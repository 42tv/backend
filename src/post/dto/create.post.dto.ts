import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

/**
 * 쪽지 전송 요청 DTO
 */
export class PostDto {
  @IsString()
  @IsNotEmpty()
  @Length(4, 20)
  @ApiProperty({
    description: '쪽지를 받을 사용자의 ID',
    example: 'receiver123',
  })
  userId: string;

  @IsString()
  @Length(1, 1000)
  @ApiProperty({
    description: '쪽지 내용',
    example: '안녕하세요! 쪽지입니다.',
    minLength: 1,
    maxLength: 1000,
  })
  message: string;
}
