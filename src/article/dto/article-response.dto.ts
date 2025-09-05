import { ApiProperty } from '@nestjs/swagger';

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
    example: 5,
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
    example: 5,
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
 * 게시글 이미지 DTO
 */
export class ArticleImageDto {
  @ApiProperty({
    description: '이미지 ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '이미지 URL',
    example: 'https://bucket.s3.amazonaws.com/articles/image.jpg',
  })
  imageUrl: string;

  @ApiProperty({
    description: '이미지 순서',
    example: 0,
  })
  imageOrder: number;
}

/**
 * 게시글 항목 DTO
 */
export class ArticleItemDto {
  @ApiProperty({
    description: '게시글 ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '작성자 인덱스',
    example: 1,
  })
  authorIdx: number;

  @ApiProperty({
    description: '게시글 내용',
    example: '게시글 내용입니다.',
  })
  content: string;

  @ApiProperty({
    description: '게시글 제목',
    example: '게시글 제목',
  })
  title: string;

  @ApiProperty({
    description: '생성일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '게시글 이미지 목록',
    type: [ArticleImageDto],
  })
  images: ArticleImageDto[];
}

/**
 * 게시글 목록 응답 DTO (페이지네이션 포함)
 */
export class ArticleResponseDto {
  @ApiProperty({
    description: '게시글 데이터',
    type: [ArticleItemDto],
  })
  data: ArticleItemDto[];

  @ApiProperty({
    description: '페이지네이션 정보',
    type: PaginationDto,
  })
  pagination: PaginationDto;
}
