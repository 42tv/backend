import { ApiProperty } from "@nestjs/swagger";

/**
 * 로그아웃 응답 DTO
 * 클라이언트로 전송되는 로그아웃 성공 응답 데이터
 */
export class LogoutResponseDto {
  @ApiProperty({ 
    description: '로그아웃 성공 메시지', 
    example: 'Successfully logged out' 
  })
  message: string;
}