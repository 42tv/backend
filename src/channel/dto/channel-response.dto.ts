import { ApiProperty } from '@nestjs/swagger';

/**
 * 사용자 정보 DTO (채널용)
 */
export class ChannelUserDto {
  @ApiProperty({
    description: '사용자 인덱스',
    example: 1,
  })
  userIdx: number;

  @ApiProperty({
    description: '사용자 ID',
    example: 'user123',
  })
  userId: string;

  @ApiProperty({
    description: '닉네임',
    example: '사용자닉네임',
  })
  nickname: string;

  @ApiProperty({
    description: '프로필 이미지 URL',
    example: 'https://profile-image-url',
  })
  profileImg: string;
}

/**
 * 페이지네이션 정보 DTO
 */
export class PaginationDto {
  @ApiProperty({
    description: '전체 개수',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: '현재 페이지',
    example: 1,
  })
  currentPage: number;

  @ApiProperty({
    description: '전체 페이지 수',
    example: 10,
  })
  totalPages: number;

  @ApiProperty({
    description: '페이지당 항목 수',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: '오프셋',
    example: 0,
  })
  offset: number;

  @ApiProperty({
    description: '다음 페이지 존재 여부',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: '이전 페이지 존재 여부',
    example: false,
  })
  hasPrev: boolean;

  @ApiProperty({
    description: '다음 오프셋',
    example: 10,
    nullable: true,
  })
  nextOffset: number | null;

  @ApiProperty({
    description: '이전 오프셋',
    example: null,
    nullable: true,
  })
  prevOffset: number | null;
}

/**
 * 게시글 목록 DTO
 */
export class ArticlesWithPaginationDto {
  @ApiProperty({
    description: '게시글 데이터',
    type: 'array',
    example: [],
  })
  data: any[];

  @ApiProperty({
    description: '페이지네이션 정보',
    type: PaginationDto,
  })
  pagination: PaginationDto;
}

/**
 * 채널 조회 응답 DTO
 */
export class GetChannelResponseDto {
  @ApiProperty({
    description: '사용자 정보',
    type: ChannelUserDto,
  })
  user: ChannelUserDto;

  @ApiProperty({
    description: '게시글 목록 (페이지네이션 포함)',
    type: ArticlesWithPaginationDto,
  })
  articles: ArticlesWithPaginationDto;

  @ApiProperty({
    description: '팬 레벨 목록',
    type: 'array',
    example: [],
  })
  fanLevel: any[];
}

/**
 * 채널 에러 응답 DTO
 */
export class ChannelErrorResponseDto {
  @ApiProperty({
    description: 'HTTP 상태 코드',
    example: 404,
  })
  statusCode: number;

  @ApiProperty({
    description: '에러 메시지',
    example: '사용자를 찾을 수 없습니다.',
  })
  message: string;

  @ApiProperty({
    description: '에러 타입',
    example: 'Not Found',
  })
  error: string;
}
