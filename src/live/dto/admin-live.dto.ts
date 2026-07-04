import { BroadcastCategory } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AdminForceEndDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminUpdateCategoryDto {
  @IsEnum(BroadcastCategory)
  category: BroadcastCategory;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reason?: string;
}
