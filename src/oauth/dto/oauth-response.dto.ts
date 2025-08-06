import { ApiProperty } from '@nestjs/swagger';

/**
 * OAuth 로그인 리다이렉트 응답 DTO
 */
export class OAuthRedirectResponseDto {
  @ApiProperty({ 
    description: 'HTTP 상태 코드', 
    example: 302 
  })
  statusCode: number;

  @ApiProperty({ 
    description: '리다이렉트 URL', 
    example: 'https://accounts.google.com/oauth/authorize?...' 
  })
  url: string;
}

/**
 * OAuth 콜백 성공 응답 DTO
 */
export class OAuthCallbackResponseDto {
  @ApiProperty({ 
    description: 'HTTP 상태 코드', 
    example: 302 
  })
  statusCode: number;

  @ApiProperty({ 
    description: 'JWT 토큰 (쿠키로 설정됨)', 
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' 
  })
  jwt: string;

  @ApiProperty({ 
    description: '리다이렉트 URL (프론트엔드)', 
    example: 'https://frontend.example.com' 
  })
  redirectUrl: string;
}

/**
 * OAuth 에러 응답 DTO
 */
export class OAuthErrorResponseDto {
  @ApiProperty({ 
    description: 'HTTP 상태 코드', 
    example: 400 
  })
  statusCode: number;

  @ApiProperty({ 
    description: '에러 메시지', 
    examples: [
      '잘못된 인증 코드',
      'OAuth 제공자 에러',
      '사용자 정보 조회 실패'
    ]
  })
  message: string;

  @ApiProperty({ 
    description: '에러 타입', 
    example: 'Bad Request' 
  })
  error: string;
}
