import { ApiProperty } from '@nestjs/swagger';

export class LogoutResponseDto {
  @ApiProperty({ 
    description: '로그아웃 성공 메시지', 
    example: 'Successfully logged out' 
  })
  message: string;
}

export class LoginInfoResponseDto {
  @ApiProperty({ 
    description: '사용자 인덱스', 
    example: 1 
  })
  idx?: number;

  @ApiProperty({ 
    description: '사용자 ID', 
    example: 'user123' 
  })
  user_id?: string;

  @ApiProperty({ 
    description: '사용자 닉네임', 
    example: 'nickname123' 
  })
  nickname?: string;

  @ApiProperty({ 
    description: '게스트 여부', 
    example: false 
  })
  is_guest?: boolean;

  @ApiProperty({ 
    description: '게스트 ID (게스트인 경우)', 
    example: 'guest_12345',
    required: false 
  })
  guest_id?: string;
}
