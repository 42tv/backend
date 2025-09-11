import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePolicyDto {
  @ApiProperty({ description: '정책 페이지 식별자 (privacy, terms, etc.)' })
  @IsString()
  @IsNotEmpty()
  page: string;

  @ApiProperty({ description: '정책 제목' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: '정책 내용' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: '정책 버전' })
  @IsString()
  @IsNotEmpty()
  version: string;

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
  @ApiProperty({ description: '정책 페이지 식별자', required: false })
  @IsString()
  @IsOptional()
  page?: string;
}
