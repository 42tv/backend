import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PolicyPageType {
  PRIVACY = 'privacy',
  TERMS = 'terms',
  COMMUNITY = 'community',
  SERVICE = 'service',
}

export enum VersionIncrementType {
  MAJOR = 'major', // 1.0 증가 (1.11 -> 2.0)
  MINOR = 'minor', // 0.1 증가 (1.11 -> 1.2)
  PATCH = 'patch', // 0.01 증가 (1.11 -> 1.12)
}

export class CreatePolicyDto {
  @ApiProperty({ description: '정책 페이지 식별자', enum: PolicyPageType })
  @IsEnum(PolicyPageType)
  @IsNotEmpty()
  page: PolicyPageType;

  @ApiProperty({ description: '정책 제목' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: '정책 내용' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: '버전 증가 타입', enum: VersionIncrementType })
  @IsEnum(VersionIncrementType)
  @IsNotEmpty()
  versionIncrementType: VersionIncrementType;

  @ApiProperty({ description: '활성화 여부', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

export class UpdatePolicyDto {
  @ApiProperty({ description: '정책 제목', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: '정책 내용', required: false })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ description: '정책 버전', required: false })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiProperty({ description: '활성화 여부', required: false })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

export class GetPolicyQueryDto {
  @ApiProperty({
    description: '정책 페이지 식별자',
    enum: PolicyPageType,
    required: false,
  })
  @IsEnum(PolicyPageType)
  @IsOptional()
  page?: PolicyPageType;
}
