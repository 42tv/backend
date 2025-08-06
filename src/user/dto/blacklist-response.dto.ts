import { ApiProperty } from '@nestjs/swagger';

/**
 * 블랙리스트 항목 응답 DTO
 */
export class BlacklistItemResponseDto {
  @ApiProperty({ 
    description: '블랙리스트 ID', 
    example: 1 
  })
  id: number;

  @ApiProperty({ 
    description: '차단 생성일시', 
    example: '2024-01-01T00:00:00.000Z' 
  })
  created_at: string;

  @ApiProperty({ 
    description: '차단된 사용자 정보',
    type: 'object',
    properties: {
      idx: { type: 'number', example: 2 },
      user_id: { type: 'string', example: 'blocked_user' },
      nickname: { type: 'string', example: '차단된사용자' },
      profile_img: { type: 'string', example: 'https://profile-image-url' }
    }
  })
  blocked: {
    idx: number;
    user_id: string;
    nickname: string;
    profile_img: string;
  };
}

/**
 * 블랙리스트 목록 조회 응답 DTO
 */
export class GetBlacklistResponseDto {
  @ApiProperty({ 
    description: '블랙리스트 목록',
    type: [BlacklistItemResponseDto]
  })
  data: BlacklistItemResponseDto[];
}

/**
 * 블랙리스트 추가 성공 응답 DTO
 */
export class AddToBlacklistResponseDto {
  @ApiProperty({ 
    description: '블랙리스트 추가 성공 메시지', 
    example: '사용자를 블랙리스트에 추가했습니다.' 
  })
  message: string;

  @ApiProperty({ 
    description: '추가된 블랙리스트 ID', 
    example: 1 
  })
  id: number;
}

/**
 * 블랙리스트 제거 성공 응답 DTO
 */
export class RemoveFromBlacklistResponseDto {
  @ApiProperty({ 
    description: '블랙리스트 제거 성공 메시지', 
    example: '사용자를 블랙리스트에서 제거했습니다.' 
  })
  message: string;
}

/**
 * 블랙리스트 다중 제거 성공 응답 DTO
 */
export class RemoveMultipleFromBlacklistResponseDto {
  @ApiProperty({ 
    description: '제거된 사용자 수', 
    example: 3 
  })
  deletedCount: number;

  @ApiProperty({ 
    description: '다중 제거 성공 메시지', 
    example: '3명의 사용자를 블랙리스트에서 제거했습니다.' 
  })
  message: string;
}

/**
 * 블랙리스트 에러 응답 DTO
 */
export class BlacklistErrorResponseDto {
  @ApiProperty({ 
    description: 'HTTP 상태 코드', 
    example: 400 
  })
  statusCode: number;

  @ApiProperty({ 
    description: '에러 메시지', 
    examples: [
      '자기 자신을 차단할 수 없습니다.',
      '이미 차단된 사용자입니다.',
      '존재하지 않는 사용자입니다.',
      '차단되지 않은 사용자입니다.',
      '유효한 사용자가 없습니다.'
    ]
  })
  message: string;

  @ApiProperty({ 
    description: '에러 타입', 
    example: 'Bad Request' 
  })
  error: string;
}
