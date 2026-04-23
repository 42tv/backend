import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { BroadcastCategory } from '@prisma/client';

/**
 * 방송 설정 DTO
 */
export class BroadcastSettingDto {
  @IsNotEmpty()
  @IsString()
  @Length(1, 30)
  @ApiProperty({
    description: '방송 제목',
    example: '방송 제목',
  })
  title: string;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({
    description: '성인 방송 여부',
    example: true,
  })
  isAdult: boolean;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({
    description: '비밀번호 여부',
    example: true,
  })
  isPrivate: boolean;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({
    description: '팬방 여부',
    example: true,
  })
  isFanClub: boolean;

  @ValidateIf((o) => o.isFanClub === true)
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  @ApiProperty({
    description: '팬 레벨',
    example: 1,
  })
  fanLevel: number;

  @ValidateIf((o) => o.isPrivate === true)
  @IsNotEmpty()
  @IsString()
  @Length(4, 8)
  @ApiProperty({
    description: '비밀번호',
    example: '1234',
  })
  password: string;

  @IsNotEmpty()
  @IsEnum(BroadcastCategory)
  @ApiProperty({
    description: '방송 카테고리',
    enum: BroadcastCategory,
    example: BroadcastCategory.TALK_DAILY,
  })
  category: BroadcastCategory;
}

/**
 * 방송 설정 업데이트 DTO
 */
export class UpdateBroadcastSettingDto {
  @IsOptional()
  @IsString()
  @Length(1, 30)
  @ApiProperty({
    description: '방송 제목',
    example: '새로운 방송 제목',
    required: false,
  })
  title?: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description: '성인 방송 여부',
    example: false,
    required: false,
  })
  isAdult?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description: '비밀번호 여부',
    example: false,
    required: false,
  })
  isPrivate?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description: '팬방 여부',
    example: false,
    required: false,
  })
  isFanClub?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @ApiProperty({
    description: '팬 레벨',
    example: 1,
    required: false,
  })
  fanLevel?: number;

  @IsOptional()
  @IsString()
  @Length(4, 8)
  @ApiProperty({
    description: '비밀번호',
    example: '1234',
    required: false,
  })
  password?: string;

  @IsOptional()
  @IsEnum(BroadcastCategory)
  @ApiProperty({
    description: '방송 카테고리',
    enum: BroadcastCategory,
    example: BroadcastCategory.TALK_DAILY,
    required: false,
  })
  category?: BroadcastCategory;
}
