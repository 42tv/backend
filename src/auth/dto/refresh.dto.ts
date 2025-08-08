import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * 토큰 갱신 요청 DTO
 * 클라이언트에서 서버로 전송되는 토큰 갱신 요청 데이터
 */
export class RefreshDto {
  @ApiProperty({
    description: 'JWT 리프레시 토큰',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}

/**
 * 토큰 갱신 응답 DTO
 * 클라이언트로 전송되는 토큰 갱신 성공 응답 데이터
 */
export class RefreshResponseDto {
  @ApiProperty({
    description: '새로 발급된 JWT 액세스 토큰',
    example: 'something jwt',
  })
  access_token: string;
}
