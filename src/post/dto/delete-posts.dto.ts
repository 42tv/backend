import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsNumber } from 'class-validator';

export class DeletePostsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  @ApiProperty({
    type: [Number],
    example: [1, 2, 3],
    description: '삭제할 쪽지 ID 배열',
  })
  postIds: number[];

  @IsEnum(['sent', 'received'])
  @IsNotEmpty()
  @ApiProperty({
    enum: ['sent', 'received'],
    example: 'received',
    description: '삭제할 쪽지 타입 (sent: 보낸쪽지, received: 받은쪽지)',
  })
  type: 'sent' | 'received';
}
