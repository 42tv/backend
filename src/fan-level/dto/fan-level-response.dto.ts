import { ApiProperty } from '@nestjs/swagger';

/**
 * 팬 레벨 항목 응답 DTO
 */
export class FanLevelItemResponseDto {
  @ApiProperty({
    description: '팬 레벨 ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '팬 레벨 이름',
    example: '브론즈',
  })
  name: string;

  @ApiProperty({
    description: '레벨 달성에 필요한 최소 도네이션 금액',
    example: 10000,
  })
  min_donation: number;

  @ApiProperty({
    description: '팬 레벨 색상 (헥스 코드)',
    example: '#CD7F32',
  })
  color: string;

  @ApiProperty({
    description: '레벨 순서',
    example: 1,
  })
  level_order: number;

  @ApiProperty({
    description: '생성일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  created_at: string;

  @ApiProperty({
    description: '수정일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  updated_at: string;
}

/**
 * 팬 레벨 목록 조회 응답 DTO
 */
export class GetFanLevelsResponseDto {
  @ApiProperty({
    description: '팬 레벨 목록',
    type: [FanLevelItemResponseDto],
  })
  data: FanLevelItemResponseDto[];
}

/**
 * 팬 레벨 업데이트 성공 응답 DTO
 */
export class UpdateFanLevelsResponseDto {
  @ApiProperty({
    description: '업데이트 성공 메시지',
    example: '팬 레벨 설정이 성공적으로 업데이트되었습니다.',
  })
  message: string;

  @ApiProperty({
    description: '업데이트된 팬 레벨 수',
    example: 5,
  })
  updatedCount: number;
}

/**
 * 팬 레벨 에러 응답 DTO
 */
export class FanLevelErrorResponseDto {
  @ApiProperty({
    description: 'HTTP 상태 코드',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: '에러 메시지',
    examples: [
      '색상은 #으로 시작하는 6자리 헥스 코드여야 합니다. (예: #FF5733)',
      '최소 도네이션 금액은 0 이상이어야 합니다.',
      '팬 레벨 이름은 필수입니다.',
      '팬 레벨은 최대 5개까지 설정할 수 있습니다.',
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
export class FanLevelUnauthorizedResponseDto {
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
