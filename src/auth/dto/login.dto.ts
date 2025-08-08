import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * 로그인 요청 DTO
 * 클라이언트에서 서버로 전송되는 로그인 요청 데이터
 */
export class LoginDto {
  @ApiProperty({
    description: '사용자 ID',
    example: 'user123',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: '비밀번호',
    example: 'password123!',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

/**
 * 로그인 응답 DTO
 * 클라이언트로 전송되는 로그인 성공 응답 데이터
 */
export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT 액세스 토큰 - 예제는 테스트용 999일짜리',
    example: 'something jwt',
  })
  access_token: string;
  @ApiProperty({
    description: 'JWT 리프레시 토큰 - 예제는 테스트용 999일짜리',
    example: 'something jwt',
  })
  refresh_token: string;
}

/**
 * 로그인 실패 응답 엔티티
 * Swagger 문서화를 위한 에러 응답 스키마
 */
export class LoginFailResponse {
  @ApiProperty({
    example: 401,
    description: 'HTTP 상태 코드',
  })
  code: number;

  @ApiProperty({
    example: 'Unauthorized',
    description: '에러 메시지',
  })
  message: string;
}
