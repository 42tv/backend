import { ApiProperty } from '@nestjs/swagger';

/**
 * 방송자 정보 DTO
 */
export class BroadcasterDto {
  @ApiProperty({ 
    description: '방송자 인덱스', 
    example: 1 
  })
  idx: number;

  @ApiProperty({ 
    description: '방송자 ID', 
    example: 'streamer123' 
  })
  user_id: string;

  @ApiProperty({ 
    description: '방송자 닉네임', 
    example: '스트리머닉네임' 
  })
  nickname: string;

  @ApiProperty({ 
    description: '방송자 프로필 이미지', 
    example: 'https://profile-image-url' 
  })
  profile_img: string;
}

/**
 * 스트림 정보 DTO
 */
export class StreamInfoDto {
  @ApiProperty({ 
    description: '방송 제목', 
    example: '오늘의 방송' 
  })
  title: string;

  @ApiProperty({ 
    description: '재생 URL', 
    example: 'https://ivs-playback-url' 
  })
  playback_url: string;

  @ApiProperty({ 
    description: '총 재생 수', 
    example: 150 
  })
  play_cnt: number;

  @ApiProperty({ 
    description: '추천 수', 
    example: 50 
  })
  recommend_cnt: number;

  @ApiProperty({ 
    description: '북마크 수', 
    example: 25 
  })
  bookmark_cnt: number;

  @ApiProperty({ 
    description: '방송 시작 시간', 
    example: '2024-01-15T10:00:00Z' 
  })
  start_time: string;
}

/**
 * 사용자 정보 DTO
 */
export class UserInfoDto {
  @ApiProperty({ 
    description: '사용자 인덱스', 
    example: 2 
  })
  user_idx: number;

  @ApiProperty({ 
    description: '사용자 ID', 
    example: 'viewer123' 
  })
  user_id: string;

  @ApiProperty({ 
    description: '사용자 닉네임', 
    example: '시청자닉네임' 
  })
  nickname: string;

  @ApiProperty({ 
    description: '사용자 프로필 이미지', 
    example: 'https://profile-image-url' 
  })
  profile_img: string;

  @ApiProperty({ 
    description: '북마크 여부', 
    example: false 
  })
  is_bookmarked: boolean;

  @ApiProperty({ 
    description: '사용자 역할',
    enum: ['broadcaster', 'manager', 'member', 'viewer', 'guest'],
    example: 'viewer'
  })
  role: string;

  @ApiProperty({ 
    description: '재생 토큰', 
    example: 'jwt-play-token' 
  })
  play_token: string;

  @ApiProperty({ 
    description: '게스트 여부', 
    example: false 
  })
  is_guest: boolean;

  @ApiProperty({ 
    description: '게스트 ID (게스트인 경우에만)', 
    example: 'guest_12345',
    required: false 
  })
  guest_id?: string;
}

/**
 * 방송 시청 성공 응답 DTO
 */
export class PlayStreamResponseDto {
  @ApiProperty({ 
    description: '방송자 정보',
    type: BroadcasterDto
  })
  broadcaster: BroadcasterDto;

  @ApiProperty({ 
    description: '스트림 정보',
    type: StreamInfoDto
  })
  stream: StreamInfoDto;

  @ApiProperty({ 
    description: '사용자 정보',
    type: UserInfoDto
  })
  user: UserInfoDto;
}

/**
 * 방송 시청 에러 응답 DTO
 */
export class PlayErrorResponseDto {
  @ApiProperty({ 
    description: 'HTTP 상태 코드', 
    example: 400 
  })
  statusCode: number;

  @ApiProperty({ 
    description: '에러 메시지', 
    examples: [
      '존재하지 않는 스트리머입니다.',
      '방송중인 스트리머가 아닙니다.',
      '게스트는 시청할 수 없습니다',
      '비밀번호가 틀렸습니다',
      '탈퇴한 유저입니다.'
    ]
  })
  message: string;

  @ApiProperty({ 
    description: '에러 타입', 
    example: 'Bad Request' 
  })
  error: string;
}

/**
 * 접근 금지 에러 응답 DTO
 */
export class PlayForbiddenResponseDto {
  @ApiProperty({ 
    description: 'HTTP 상태 코드', 
    example: 403 
  })
  statusCode: number;

  @ApiProperty({ 
    description: '접근 금지 메시지', 
    example: '차단된 사용자입니다. 방송을 시청할 수 없습니다.' 
  })
  message: string;

  @ApiProperty({ 
    description: '에러 타입', 
    example: 'Forbidden' 
  })
  error: string;
}
