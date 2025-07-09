import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger용 차단 목록 응답 클래스
 * API 문서화를 위한 차단 목록 조회 응답 스키마입니다.
 */
export class BlacklistResponseSwagger {
  @ApiProperty({ 
    description: '차단 목록 ID', 
    example: 1 
  })
  id: number;

  @ApiProperty({ 
    description: '방송자 인덱스', 
    example: 1 
  })
  broadcaster_idx: number;

  @ApiProperty({ 
    description: '차단된 사용자 인덱스', 
    example: 2 
  })
  blocked_idx: number;

  @ApiProperty({ 
    description: '차단 생성일', 
    example: '2024-01-01T00:00:00.000Z' 
  })
  created_at: Date;

  @ApiProperty({ 
    description: '차단된 사용자 정보',
    required: false,
    example: {
      idx: 2,
      user_id: 'user123',
      nickname: 'nickname123',
      profile_img: 'https://example.com/profile.jpg'
    }
  })
  blocked?: {
    idx: number;
    user_id: string;
    nickname: string;
    profile_img: string;
  };
}

/**
 * Swagger용 차단 성공 응답 클래스
 */
export class BlacklistSuccessResponseSwagger {
  @ApiProperty({ 
    description: '성공 메시지', 
    example: '사용자가 성공적으로 차단되었습니다.' 
  })
  message: string;
}

/**
 * Swagger용 차단 해제 성공 응답 클래스
 */
export class BlacklistRemoveSuccessResponseSwagger {
  @ApiProperty({ 
    description: '성공 메시지', 
    example: '사용자 차단이 성공적으로 해제되었습니다.' 
  })
  message: string;
}
