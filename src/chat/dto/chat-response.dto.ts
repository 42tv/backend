import { ApiProperty } from '@nestjs/swagger';

/**
 * 채팅 전송 성공 응답 DTO
 */
export class SendChatResponseDto {
  @ApiProperty({
    description: '채팅 전송 성공 메시지',
    example: '채팅이 성공적으로 전송되었습니다.',
  })
  message: string;

  @ApiProperty({
    description: '채팅 ID',
    example: 'chat_12345',
  })
  chatId: string;

  @ApiProperty({
    description: '전송 시간',
    example: '2024-01-01T00:00:00.000Z',
  })
  timestamp: string;
}

/**
 * 채팅 에러 응답 DTO
 */
export class ChatErrorResponseDto {
  @ApiProperty({
    description: 'HTTP 상태 코드',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: '에러 메시지',
    examples: [
      'Bad Request',
      '방송자를 찾을 수 없습니다.',
      '메시지가 너무 깁니다.',
      '채팅이 제한되었습니다.',
    ],
  })
  message: string;

  @ApiProperty({
    description: '에러 타입',
    example: 'Bad Request',
  })
  error: string;
}

/**
 * 인증 에러 응답 DTO
 */
export class ChatUnauthorizedResponseDto {
  @ApiProperty({
    description: 'HTTP 상태 코드',
    example: 401,
  })
  statusCode: number;

  @ApiProperty({
    description: '에러 메시지',
    example: 'Unauthorized',
  })
  message: string;
}
