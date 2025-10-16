import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    description: '상품명',
    example: '100 코인',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: '상품 설명',
    example: '기본 100코인 + 보너스 10코인',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '기본 코인량',
    example: 100,
    minimum: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  base_coins: number;

  @ApiPropertyOptional({
    description: '보너스 코인량',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bonus_coins?: number;

  @ApiProperty({
    description: '가격 (원)',
    example: 1000,
    minimum: 1,
    maximum: 1000000,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000000)
  price: number;

  @ApiPropertyOptional({
    description: '상품 타입 (normal: 일반, star: 스타 코인)',
    example: 'star',
    enum: ['normal', 'star'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['normal', 'star'])
  product_type?: string;

  @ApiPropertyOptional({
    description: '활성화 여부',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: '정렬 순서',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional({
    description: '이미지 삭제 여부 (수정 시에만 사용)',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  remove_image?: boolean;
}
