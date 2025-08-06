import { ApiProperty } from '@nestjs/swagger';

/**
 * 북마크된 사용자 정보 DTO
 */
export class BookmarkedUserDto {
  @ApiProperty({ 
    description: '사용자 인덱스', 
    example: 1 
  })
  idx: number;

  @ApiProperty({ 
    description: '사용자 ID', 
    example: 'user123' 
  })
  user_id: string;

  @ApiProperty({ 
    description: '사용자 닉네임', 
    example: '닉네임123' 
  })
  nickname: string;

  @ApiProperty({ 
    description: '프로필 이미지 URL', 
    example: 'https://profile-image-url' 
  })
  profile_img: string;
}

/**
 * 북마크 항목 응답 DTO
 */
export class BookmarkItemResponseDto {
  @ApiProperty({ 
    description: '북마크 ID', 
    example: 1 
  })
  id: number;

  @ApiProperty({ 
    description: '북마크 생성일시', 
    example: '2024-01-01T00:00:00.000Z' 
  })
  created_at: string;

  @ApiProperty({ 
    description: '북마크된 사용자 정보',
    type: BookmarkedUserDto
  })
  bookmarked: BookmarkedUserDto;
}

/**
 * 북마크 목록 조회 응답 DTO
 */
export class GetBookmarksResponseDto {
  @ApiProperty({ 
    description: '북마크 목록',
    type: [BookmarkItemResponseDto]
  })
  data: BookmarkItemResponseDto[];
}

/**
 * 북마크 추가 성공 응답 DTO
 */
export class AddBookmarkResponseDto {
  @ApiProperty({ 
    description: '북마크 추가 성공 메시지', 
    example: '북마크가 추가되었습니다.' 
  })
  message: string;

  @ApiProperty({ 
    description: '추가된 북마크 ID', 
    example: 1 
  })
  id: number;
}

/**
 * 북마크 삭제 성공 응답 DTO
 */
export class DeleteBookmarkResponseDto {
  @ApiProperty({ 
    description: '북마크 삭제 성공 메시지', 
    example: '북마크가 삭제되었습니다.' 
  })
  message: string;
}

/**
 * 북마크 일괄 삭제 성공 응답 DTO
 */
export class DeleteBookmarksResponseDto {
  @ApiProperty({ 
    description: '삭제된 북마크 수', 
    example: 3 
  })
  deletedCount: number;

  @ApiProperty({ 
    description: '일괄 삭제 성공 메시지', 
    example: '3개의 북마크가 삭제되었습니다.' 
  })
  message: string;
}

/**
 * 북마크 에러 응답 DTO
 */
export class BookmarkErrorResponseDto {
  @ApiProperty({ 
    description: 'HTTP 상태 코드', 
    example: 400 
  })
  statusCode: number;

  @ApiProperty({ 
    description: '에러 메시지', 
    examples: [
      '자기 자신을 북마크할 수 없습니다.',
      '이미 북마크된 사용자입니다.',
      '존재하지 않는 사용자입니다.',
      '북마크되지 않은 사용자입니다.',
      '유효한 북마크가 없습니다.'
    ]
  })
  message: string;

  @ApiProperty({ 
    description: '에러 타입', 
    example: 'Bad Request' 
  })
  error: string;
}
