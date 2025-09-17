import { ApiProperty } from '@nestjs/swagger';

export class PolicyResponseDto {
  @ApiProperty({ description: '정책 ID' })
  id: number;

  @ApiProperty({ description: '정책 페이지 식별자' })
  page: string;

  @ApiProperty({ description: '정책 제목' })
  title: string;

  @ApiProperty({ description: '정책 내용' })
  content: string;

  @ApiProperty({ description: '정책 버전' })
  version: string;

  @ApiProperty({ description: '활성화 여부' })
  is_active: boolean;

  @ApiProperty({ description: '생성일' })
  created_at: Date;

  @ApiProperty({ description: '수정일' })
  updated_at: Date;
}

export class PolicyListResponseDto {
  @ApiProperty({ description: '성공 여부' })
  success: boolean;

  @ApiProperty({ description: '응답 메시지' })
  message: string;

  @ApiProperty({
    description: '정책 목록',
    type: [PolicyResponseDto],
    required: false,
  })
  data?: PolicyResponseDto[];
}

export class PolicyCreateSuccessResponseDto {
  @ApiProperty({ description: '성공 메시지' })
  success: string;

  @ApiProperty({ description: '생성된 정책 정보', type: PolicyResponseDto })
  policy: PolicyResponseDto;
}
