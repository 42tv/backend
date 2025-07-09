import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger용 사용자 엔티티
 * API 문서화를 위한 사용자 정보 스키마입니다.
 */
export class UserSwagger {
  @ApiProperty({ example: 1, description: 'User 유니크 index' })
  idx: number;

  @ApiProperty({ example: 'user123', description: '사용자 ID' })
  userId: string;

  @ApiProperty({
    example: 'password123!',
    description: '비밀번호 8자리 이상 알파벳,숫자,특수문자 1개씩 이상',
    required: false,
  })
  password?: string;

  @ApiProperty({
    example: 'nickname123',
    description: '닉네임',
  })
  nickname: string;

  @ApiProperty({
    example: 'https://example.com/profile.jpg',
    description: '프로필 이미지 URL',
    default: '',
  })
  profileImg: string = '';

  @ApiProperty({
    example: null,
    description: 'OAuth 제공자 (e.g., google, facebook)',
    required: false,
  })
  oauthProvider?: string;

  @ApiProperty({
    example: null,
    description: 'OAuth 제공자 unique ID',
    required: false,
  })
  oauthProviderId?: string;

  @ApiProperty({
    example: null,
    description: 'User detail index',
    required: false,
  })
  userDetailIdx?: number;
}
