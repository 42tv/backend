import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger용 인증 엔티티 클래스
 * 실제 로그인 요청시에는 LocalAuthGuard가 처리하므로, 이 클래스는 API 문서화 목적으로만 사용됩니다.
 */
export class AuthEntity {
  @ApiProperty({
    example: 'user123',
    description: '사용자 ID. LocalAuthGard로 인해 username이라는 명칭',
  })
  username: number;

  @ApiProperty({ example: 'password123!', description: '비밀번호' })
  password: string;
}

/**
 * Swagger용 인증 실패 응답 클래스
 * API 문서화를 위한 에러 응답 스키마입니다.
 */
export class AuthFailResponse {
  @ApiProperty({ example: 401 })
  code: number;
  @ApiProperty({ example: 'Unauthorized' })
  message: any;
}
