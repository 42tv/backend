import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class PostDto {
  @IsString()
  @IsNotEmpty()
  @Length(4, 20)
  @ApiProperty({
    example: '3333',
    not: null,
    description: '쪽지를 받을 유저의 아이디',
  })
  userId: string;

  @IsString()
  @Length(1, 1000)
  @ApiProperty({
    example: '대충 쪽지 내용',
    minLength: 1,
    maxLength: 1000,
    description: '쪽지 내용',
  })
  message: string;
}
