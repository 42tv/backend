import { ApiProperty } from '@nestjs/swagger';
import { ArticleResponseDto } from 'src/article/dto/article-response.dto';
import { FanLevelSimpleDto } from 'src/fan-level/dto/fan-level-simple.dto';

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
    type: ArticleResponseDto,
  })
  articles: ArticleResponseDto;

  @ApiProperty({
    description: '팬 레벨 목록',
    type: [FanLevelSimpleDto],
  })
  fanLevel: FanLevelSimpleDto[];
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
