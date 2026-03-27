import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { DonationWidgetStyle } from '@prisma/client';

export class UpdateDonationConfigDto {
  @IsOptional()
  @IsEnum(DonationWidgetStyle)
  style?: DonationWidgetStyle;

  @IsOptional()
  @IsInt()
  @Min(0)
  min_display_amount?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  display_duration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  goal_amount?: number;

  @IsOptional()
  @IsString()
  goal_label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  bg_opacity?: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(100)
  font_size?: number;

  @IsOptional()
  @IsString()
  animation_type?: string;

  @IsOptional()
  @IsBoolean()
  sound_enabled?: boolean;
}
