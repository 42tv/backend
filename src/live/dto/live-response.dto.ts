import { ApiProperty } from '@nestjs/swagger';

/**
 * 방송 설정 정보 DTO
 */
export class BroadcastSettingInfoDto {
  @ApiProperty({ 
    description: '성인 방송 여부', 
    example: false 
  })
  is_adult: boolean;

  @ApiProperty({ 
    description: '팬방 설정 여부', 
    example: false 
  })
  is_fan: boolean;

  @ApiProperty({ 
    description: '비밀번호 설정 여부', 
    example: false 
  })
  is_pw: boolean;

  @ApiProperty({ 
    description: '방송 제목', 
    example: '오늘의 방송' 
  })
  title: string;

  @ApiProperty({ 
    description: '팬 레벨 제한', 
    example: 1 
  })
  fan_level: number;
}

/**
 * 방송자 정보 DTO
 */
export class BroadcasterInfoDto {
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
    example: '스트리머' 
  })
  nickname: string;

  @ApiProperty({ 
    description: '프로필 이미지 URL', 
    example: 'https://example.com/profile.jpg' 
  })
  profile_img: string;

  @ApiProperty({ 
    description: '방송 설정 정보',
    type: BroadcastSettingInfoDto
  })
  broadcastSetting: BroadcastSettingInfoDto;
}

/**
 * 실시간 방송 항목 DTO
 */
export class LiveStreamItemDto {
  @ApiProperty({ 
    description: '썸네일 이미지 URL', 
    example: 'https://example.com/thumbnail.jpg' 
  })
  thumbnail: string;

  @ApiProperty({ 
    description: '방송 시작 시간', 
    example: '2024-01-15T10:00:00Z' 
  })
  start_time: string;

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
    description: '현재 시청자 수', 
    example: 75 
  })
  viewerCount: number;

  @ApiProperty({ 
    description: '방송자 정보',
    type: BroadcasterInfoDto
  })
  broadcaster: BroadcasterInfoDto;
}

/**
 * 실시간 방송 목록 조회 응답 DTO
 */
export class GetLiveListResponseDto {
  @ApiProperty({ 
    description: '응답 코드', 
    example: 200 
  })
  code: number;

  @ApiProperty({ 
    description: '응답 메시지', 
    example: 'success' 
  })
  message: string;

  @ApiProperty({ 
    description: '실시간 방송 목록',
    type: [LiveStreamItemDto]
  })
  lives: LiveStreamItemDto[];
}

/**
 * 실시간 방송 추천 성공 응답 DTO
 */
export class RecommendLiveStreamResponseDto {
  @ApiProperty({ 
    description: '응답 코드', 
    example: 200 
  })
  code: number;

  @ApiProperty({ 
    description: '추천 성공 메시지', 
    example: 'Live stream recommended successfully' 
  })
  message: string;
}

/**
 * 시청자 정보 DTO
 */
export class ViewerInfoDto {
  @ApiProperty({ 
    description: '사용자 ID', 
    example: 'registerId123' 
  })
  user_id: string;

  @ApiProperty({ 
    description: '사용자 인덱스', 
    example: 1 
  })
  user_idx: number;

  @ApiProperty({ 
    description: '사용자 닉네임', 
    example: '시청자닉네임' 
  })
  nickname: string;

  @ApiProperty({ 
    description: '사용자 역할',
    enum: ['broadcaster', 'manager', 'viewer'],
    example: 'viewer'
  })
  role: string;
}

/**
 * 방송자 시청자 목록 조회 응답 DTO
 */
export class GetBroadcasterViewersResponseDto {
  @ApiProperty({ 
    description: '응답 코드', 
    example: 200 
  })
  code: number;

  @ApiProperty({ 
    description: '응답 메시지', 
    example: 'success' 
  })
  message: string;

  @ApiProperty({ 
    description: '시청자 목록',
    type: [ViewerInfoDto]
  })
  viewers: ViewerInfoDto[];
}

/**
 * 실시간 방송 에러 응답 DTO
 */
export class LiveErrorResponseDto {
  @ApiProperty({ 
    description: 'HTTP 상태 코드', 
    example: 400 
  })
  statusCode: number;

  @ApiProperty({ 
    description: '에러 메시지', 
    examples: [
      '오늘 이미 추천하셨습니다.',
      '방송자를 찾을 수 없습니다.',
      '방송이 종료되었습니다.'
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
 * 인증 에러 응답 DTO
 */
export class LiveUnauthorizedResponseDto {
  @ApiProperty({ 
    description: 'HTTP 상태 코드', 
    example: 401 
  })
  statusCode: number;

  @ApiProperty({ 
    description: '에러 메시지', 
    example: 'Unauthorized' 
  })
  message: string;
}
