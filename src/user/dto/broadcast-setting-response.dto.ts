import { ApiProperty } from '@nestjs/swagger';

/**
 * IVS 정보 DTO
 */
export class IvsInfoDto {
  @ApiProperty({ 
    description: 'IVS 채널 ARN', 
    example: 'arn:aws:ivs:region:account:channel/channel-id' 
  })
  arn: string;

  @ApiProperty({ 
    description: 'IVS 스트림 키', 
    example: 'sk_region_streamkey' 
  })
  stream_key: string;

  @ApiProperty({ 
    description: 'IVS 인제스트 엔드포인트', 
    example: 'rtmps://ingest-endpoint.ivs.region.amazonaws.com:443/live/' 
  })
  ingest_endpoint: string;
}

/**
 * 방송 설정 조회 응답 DTO
 */
export class GetBroadcastSettingResponseDto {
  @ApiProperty({ 
    description: '방송 설정 ID', 
    example: 1 
  })
  id: number;

  @ApiProperty({ 
    description: '방송 제목', 
    example: '내 방송 제목' 
  })
  title: string;

  @ApiProperty({ 
    description: '성인 방송 여부', 
    example: false 
  })
  isAdult: boolean;

  @ApiProperty({ 
    description: '비밀번호 설정 여부', 
    example: true 
  })
  isPrivate: boolean;

  @ApiProperty({ 
    description: '팬방 설정 여부', 
    example: true 
  })
  isFanClub: boolean;

  @ApiProperty({ 
    description: '팬 레벨 제한', 
    example: 3 
  })
  fanLevel: number;

  @ApiProperty({ 
    description: '방송 비밀번호 (설정된 경우)', 
    example: '1234',
    required: false 
  })
  password?: string;

  @ApiProperty({ 
    description: 'IVS 설정 정보',
    type: IvsInfoDto
  })
  ivs: IvsInfoDto;

  @ApiProperty({ 
    description: '생성일시', 
    example: '2024-01-01T00:00:00.000Z' 
  })
  created_at: string;

  @ApiProperty({ 
    description: '수정일시', 
    example: '2024-01-01T00:00:00.000Z' 
  })
  updated_at: string;
}

/**
 * 방송 설정 업데이트 성공 응답 DTO
 */
export class UpdateBroadcastSettingResponseDto {
  @ApiProperty({ 
    description: '업데이트 성공 메시지', 
    example: '변경 성공' 
  })
  message: string;
}

/**
 * 방송 설정 에러 응답 DTO
 */
export class BroadcastSettingErrorResponseDto {
  @ApiProperty({ 
    description: 'HTTP 상태 코드', 
    example: 400 
  })
  statusCode: number;

  @ApiProperty({ 
    description: '에러 메시지', 
    examples: [
      '존재하지 않는 프리셋입니다.',
      '방송 제목은 1-30자여야 합니다.',
      '팬 레벨은 1-5 사이여야 합니다.',
      '비밀번호는 4-8자여야 합니다.'
    ]
  })
  message: string;

  @ApiProperty({ 
    description: '에러 타입', 
    example: 'Bad Request' 
  })
  error: string;
}
