import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger용 토큰 갱신 응답 클래스
 * API 문서화를 위한 토큰 갱신 성공 응답 스키마입니다.
 */
export class RefreshResponse {
  @ApiProperty({
    description: '새로 발급된 JWT 액세스 토큰',
    example:
      'something jwt',
  })
  access_token: string;
}
