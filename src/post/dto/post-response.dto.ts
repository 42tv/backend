import { ApiProperty } from '@nestjs/swagger';

/**
 * 쪽지 발신자 정보 DTO
 */
export class PostSenderDto {
  @ApiProperty({
    description: '발신자 인덱스',
    example: 1,
  })
  idx: number;

  @ApiProperty({
    description: '발신자 ID',
    example: 'sender123',
  })
  userId: string;

  @ApiProperty({
    description: '발신자 닉네임',
    example: '발신자닉네임',
  })
  nickname: string;
}

/**
 * 쪽지 수신자 정보 DTO
 */
export class PostReceiverDto {
  @ApiProperty({
    description: '수신자 인덱스',
    example: 2,
  })
  idx: number;

  @ApiProperty({
    description: '수신자 ID',
    example: 'receiver123',
  })
  userId: string;

  @ApiProperty({
    description: '수신자 닉네임',
    example: '수신자닉네임',
  })
  nickname: string;
}

/**
 * 쪽지 항목 DTO
 */
export class PostItemDto {
  @ApiProperty({
    description: '쪽지 ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '쪽지 내용',
    example: '안녕하세요! 쪽지입니다.',
  })
  message: string;

  @ApiProperty({
    description: '읽음 여부',
    example: false,
  })
  isRead: boolean;

  @ApiProperty({
    description: '생성일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: '발신자 정보',
    type: PostSenderDto,
  })
  sender: PostSenderDto;

  @ApiProperty({
    description: '수신자 정보',
    type: PostReceiverDto,
  })
  receiver: PostReceiverDto;
}

/**
 * 쪽지 목록 조회 응답 DTO
 */
export class GetPostsResponseDto {
  @ApiProperty({
    description: '쪽지 목록',
    type: [PostItemDto],
  })
  posts: PostItemDto[];

  @ApiProperty({
    description: '총 쪽지 수',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: '읽지 않은 쪽지 수',
    example: 3,
  })
  unreadCount: number;
}

/**
 * 쪽지 전송 성공 응답 DTO
 */
export class PostCreateResponseDto {
  @ApiProperty({
    description: '쪽지 전송 성공 메시지',
    example: '쪽지를 성공적으로 보냈습니다.',
  })
  message: string;

  @ApiProperty({
    description: '생성된 쪽지 ID',
    example: 123,
  })
  postId: number;
}

/**
 * 쪽지 읽음 처리 응답 DTO
 */
export class PostReadResponseDto {
  @ApiProperty({
    description: '쪽지 읽음 처리 메시지',
    example: '쪽지를 읽었습니다',
  })
  message: string;
}

/**
 * 쪽지 삭제 응답 DTO
 */
export class PostDeleteResponseDto {
  @ApiProperty({
    description: '쪽지 삭제 성공 메시지',
    example: '쪽지를 삭제했습니다',
  })
  message: string;

  @ApiProperty({
    description: '삭제된 쪽지 수',
    example: 3,
  })
  deletedCount: number;
}

/**
 * 차단된 사용자 정보 DTO
 */
export class BlockedUserDto {
  @ApiProperty({
    description: '사용자 인덱스',
    example: 1,
  })
  idx: number;

  @ApiProperty({
    description: '사용자 ID',
    example: 'blocked_user',
  })
  userId: string;

  @ApiProperty({
    description: '사용자 닉네임',
    example: '차단된사용자',
  })
  nickname: string;

  @ApiProperty({
    description: '차단일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  blockedAt: string;
}

/**
 * 차단된 사용자 목록 조회 응답 DTO
 */
export class GetBlockedUsersResponseDto {
  @ApiProperty({
    description: '차단된 사용자 목록',
    type: [BlockedUserDto],
  })
  blockedUsers: BlockedUserDto[];
}

/**
 * 사용자 차단 성공 응답 DTO
 */
export class PostBlockResponseDto {
  @ApiProperty({
    description: '차단 성공 메시지',
    example: '차단 성공',
  })
  message: string;
}

/**
 * 사용자 차단 해제 성공 응답 DTO
 */
export class PostUnBlockResponseDto {
  @ApiProperty({
    description: '차단 해제 성공 메시지',
    example: '차단 해제 성공',
  })
  message: string;
}

/**
 * 쪽지 설정 정보 DTO
 */
export class PostSettingsDto {
  @ApiProperty({
    description: '최소 팬 레벨 제한',
    example: 3,
    required: false,
  })
  minFanLevel?: number;

  @ApiProperty({
    description: '쪽지 수신 허용 여부',
    example: true,
  })
  allowMessages: boolean;
}

/**
 * 쪽지 설정 조회 응답 DTO
 */
export class GetPostSettingsResponseDto {
  @ApiProperty({
    description: '쪽지 설정 정보',
    type: PostSettingsDto,
  })
  settings: PostSettingsDto;
}

/**
 * 쪽지 설정 업데이트 응답 DTO
 */
export class UpdatePostSettingsResponseDto {
  @ApiProperty({
    description: '설정 업데이트 성공 메시지',
    example: '설정이 업데이트되었습니다.',
  })
  message: string;
}

/**
 * 쪽지 에러 응답 DTO
 */
export class PostErrorResponseDto {
  @ApiProperty({
    description: 'HTTP 상태 코드',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: '에러 메시지',
    examples: [
      '존재하지 않는 사용자입니다.',
      '자기 자신에게 쪽지를 보낼 수 없습니다.',
      '차단된 사용자에게 쪽지를 보낼 수 없습니다.',
      '팬 레벨이 부족합니다.',
      '쪽지 내용은 1-1000자여야 합니다.',
      '이미 차단된 사용자입니다.',
      '차단되지 않은 사용자입니다.',
    ],
  })
  message: string;

  @ApiProperty({
    description: '에러 타입',
    example: 'Bad Request',
  })
  error: string;
}

/**
 * 인증 에러 응답 DTO
 */
export class PostUnauthorizedResponseDto {
  @ApiProperty({
    description: 'HTTP 상태 코드',
    example: 401,
  })
  statusCode: number;

  @ApiProperty({
    description: '에러 메시지',
    example: 'Unauthorized',
  })
  message: string;
}
