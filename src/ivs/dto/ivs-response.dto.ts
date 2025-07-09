import { ApiProperty } from '@nestjs/swagger';

/**
 * IVS 채널 생성/재발급 성공 응답 DTO
 */
export class CreateIvsResponseDto {
  @ApiProperty({ 
    description: 'User 유니크 index', 
    example: 1 
  })
  user_idx: number;

  @ApiProperty({ 
    description: '채널 ARN', 
    example: 'arn:aws:ivs:region:account:channel/channel-id' 
  })
  arn: string;

  @ApiProperty({
    description: 'ingest endpoint',
    example: '632c5f96112a.global-contribute.live-video.net',
  })
  ingest_endpoint: string;

  @ApiProperty({
    description: '재생 주소',
    example: 'https://playback-url.ivs.region.amazonaws.com/v1/master.m3u8',
  })
  playback_url: string;

  @ApiProperty({
    description: 'stream key',
    example: 'sk_region_streamkey',
  })
  stream_key: string;

  @ApiProperty({
    description: 'streamkey arn',
    example: 'arn:aws:ivs:region:account:stream-key/streamkey-id',
  })
  stream_key_arn: string;

  @ApiProperty({
    description: '채널명',
    example: 'user123',
  })
  name: string;

  @ApiProperty({
    description: '생성일시',
    example: '2025-02-11T12:04:46.361Z',
  })
  createdAt: string;
}

/**
 * IVS 콜백 처리 성공 응답 DTO
 */
export class IvsCallbackResponseDto {
  @ApiProperty({ 
    description: '콜백 처리 성공 메시지', 
    example: 'success' 
  })
  message: string;
}

/**
 * IVS 채널 동기화 응답 DTO
 */
export class IvsSyncChannelsResponseDto {
  @ApiProperty({ 
    description: '동기화 성공 메시지', 
    example: '채널 동기화가 완료되었습니다.' 
  })
  message: string;

  @ApiProperty({ 
    description: '삭제된 고아 채널 수', 
    example: 3 
  })
  deletedOrphanedChannels: number;
}

/**
 * IVS 에러 응답 DTO
 */
export class IvsErrorResponseDto {
  @ApiProperty({ 
    description: 'HTTP 상태 코드', 
    example: 500 
  })
  statusCode: number;

  @ApiProperty({ 
    description: '에러 메시지', 
    examples: [
      'AWS IVS의 채널 생성 실패 케이스',
      'streamKey 재발급 실패',
      '방송 중에는 스트림키를 재발급할 수 없습니다.',
      '채널을 찾을 수 없습니다.'
    ]
  })
  message: string;

  @ApiProperty({ 
    description: '에러 타입', 
    example: 'Internal Server Error' 
  })
  error: string;
}

/**
 * 인증 에러 응답 DTO
 */
export class IvsUnauthorizedResponseDto {
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
