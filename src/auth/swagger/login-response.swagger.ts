import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger용 로그인 응답 클래스
 * API 문서화를 위한 로그인 성공 응답 스키마입니다.
 */
export class LoginResponse {
  @ApiProperty({
    description: 'JWT 액세스 토큰 - 예제는 테스트용 999일짜리',
    example:
      'something jwt',
  })
  access_token: string;
  @ApiProperty({
    description: 'JWT 리프레시 토큰 - 예제는 테스트용 999일짜리',
    example:
      'something jwt',
  })
  refresh_token: string;
}
