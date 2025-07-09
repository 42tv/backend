import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * 채팅 메시지 전송 요청 DTO
 */
export class SendChatDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: '방송자의 ID',
    example: 'streamer123',
  })
  broadcaster_id: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: '채팅 메시지 내용',
    example: '안녕하세요!',
  })
  message: string;
}
