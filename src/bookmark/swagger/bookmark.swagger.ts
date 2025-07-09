import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger용 북마크 응답 클래스
 * API 문서화를 위한 북마크 정보 응답 스키마입니다.
 */
export class BookmarkResponseSwagger {
  @ApiProperty({ 
    description: '북마크 ID', 
    example: 1 
  })
  id: number;

  @ApiProperty({ 
    description: '북마크한 사용자 인덱스', 
    example: 1 
  })
  bookmarker_idx: number;

  @ApiProperty({ 
    description: '북마크된 사용자 인덱스', 
    example: 2 
  })
  bookmarked_idx: number;

  @ApiProperty({ 
    description: '북마크 생성일', 
    example: '2024-01-01T00:00:00.000Z' 
  })
  created_at: Date;

  @ApiProperty({ 
    description: '북마크된 사용자 정보',
    required: false,
    example: {
      idx: 2,
      user_id: 'user123',
      nickname: 'nickname123',
      profile_img: 'https://example.com/profile.jpg'
    }
  })
  bookmarked?: {
    idx: number;
    user_id: string;
    nickname: string;
    profile_img: string;
  };
}

/**
 * Swagger용 북마크 성공 응답 클래스
 */
export class BookmarkSuccessResponseSwagger {
  @ApiProperty({ 
    description: '성공 메시지', 
    example: '북마크가 성공적으로 추가되었습니다.' 
  })
  message: string;
}

/**
 * Swagger용 북마크 삭제 성공 응답 클래스
 */
export class BookmarkDeleteSuccessResponseSwagger {
  @ApiProperty({ 
    description: '성공 메시지', 
    example: '북마크가 성공적으로 삭제되었습니다.' 
  })
  message: string;
}
