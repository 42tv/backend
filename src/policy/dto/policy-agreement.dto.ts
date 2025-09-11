import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePolicyAgreementDto {
  @ApiProperty({ description: '정책 ID' })
  @IsInt()
  @IsNotEmpty()
  policy_id: number;

  @ApiProperty({ description: '정책 버전' })
  @IsString()
  @IsNotEmpty()
  policy_version: string;

  @ApiProperty({ description: 'IP 주소', required: false })
  @IsString()
  @IsOptional()
  ip_address?: string;
}

export class PolicyAgreementResponseDto {
  @ApiProperty({ description: '동의 ID' })
  id: number;

  @ApiProperty({ description: '사용자 IDX' })
  user_idx: number;

  @ApiProperty({ description: '정책 ID' })
  policy_id: number;

  @ApiProperty({ description: '정책 버전' })
  policy_version: string;

  @ApiProperty({ description: '동의 일시' })
  agreed_at: Date;

  @ApiProperty({ description: 'IP 주소', required: false })
  ip_address?: string;

  @ApiProperty({ description: '정책 정보', required: false })
  policy?: {
    page: string;
    title: string;
    content: string;
  };
}

export class UserPolicyAgreementsResponseDto {
  @ApiProperty({
    description: '사용자 정책 동의 목록',
    type: [PolicyAgreementResponseDto],
  })
  agreements: PolicyAgreementResponseDto[];

  @ApiProperty({ description: '총 개수' })
  total: number;
}

export class PolicyAgreementStatusDto {
  @ApiProperty({ description: '정책 페이지' })
  page: string;

  @ApiProperty({ description: '정책 제목' })
  title: string;

  @ApiProperty({ description: '현재 버전' })
  current_version: string;

  @ApiProperty({ description: '동의 여부' })
  is_agreed: boolean;

  @ApiProperty({ description: '동의한 버전 (동의한 경우)' })
  agreed_version?: string;

  @ApiProperty({ description: '동의 일시 (동의한 경우)' })
  agreed_at?: Date;
}
