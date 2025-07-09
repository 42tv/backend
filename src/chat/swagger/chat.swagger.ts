import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger용 채팅 메시지 전송 성공 응답 클래스
 * API 문서화를 위한 채팅 전송 성공 응답 스키마입니다.
 */
export class ChatSuccessResponseSwagger {
  @ApiProperty({ 
    description: '성공 메시지', 
    example: '채팅 메시지가 성공적으로 전송되었습니다.' 
  })
  message: string;

  @ApiProperty({ 
    description: '전송된 메시지 ID', 
    example: 'msg_123456',
    required: false
  })
  messageId?: string;
}

/**
 * Swagger용 채팅 에러 응답 클래스
 */
export class ChatErrorResponseSwagger {
  @ApiProperty({ 
    description: 'HTTP 상태 코드', 
    example: 400 
  })
  statusCode: number;

  @ApiProperty({ 
    description: '에러 메시지', 
    example: 'Bad Request' 
  })
  message: string;

  @ApiProperty({ 
    description: '에러 타입', 
    example: 'Bad Request' 
  })
  error: string;
}
