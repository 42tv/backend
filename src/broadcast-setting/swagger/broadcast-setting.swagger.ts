import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger용 방송 설정 응답 클래스
 * API 문서화를 위한 방송 설정 정보 응답 스키마입니다.
 */
export class BroadcastSettingResponseSwagger {
  @ApiProperty({ 
    description: '방송 설정 ID', 
    example: 1 
  })
  id: number;

  @ApiProperty({ 
    description: '사용자 인덱스', 
    example: 1 
  })
  user_idx: number;

  @ApiProperty({ 
    description: '방송 제목', 
    example: '재미있는 방송입니다!' 
  })
  title: string;

  @ApiProperty({ 
    description: '성인 방송 여부', 
    example: false 
  })
  is_adult: boolean;

  @ApiProperty({ 
    description: '비밀번호 방송 여부', 
    example: false 
  })
  is_pw: boolean;

  @ApiProperty({ 
    description: '팬방 여부', 
    example: true 
  })
  is_fan: boolean;

  @ApiProperty({ 
    description: '팬 레벨 (팬방인 경우)', 
    example: 2,
    required: false 
  })
  fan_level: number | null;

  @ApiProperty({ 
    description: '방송 비밀번호 (비밀번호 방송인 경우)', 
    example: null,
    required: false 
  })
  password: string | null;

  @ApiProperty({ 
    description: '생성일', 
    example: '2024-01-01T00:00:00.000Z' 
  })
  created_at: Date;

  @ApiProperty({ 
    description: '수정일', 
    example: '2024-01-01T00:00:00.000Z' 
  })
  updated_at: Date;
}

/**
 * Swagger용 방송 설정 성공 응답 클래스
 */
export class BroadcastSettingSuccessResponseSwagger {
  @ApiProperty({ 
    description: '성공 메시지', 
    example: '방송 설정이 성공적으로 업데이트되었습니다.' 
  })
  message: string;
}
