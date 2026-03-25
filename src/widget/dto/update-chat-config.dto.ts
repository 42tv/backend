import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ChatWidgetStyle, WidgetFontSize } from '@prisma/client';

export class UpdateChatConfigDto {
  @IsOptional()
  @IsEnum(ChatWidgetStyle)
  style?: ChatWidgetStyle;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  max_messages?: number;

  @IsOptional()
  @IsBoolean()
  show_profile_image?: boolean;

  @IsOptional()
  @IsEnum(WidgetFontSize)
  font_size?: WidgetFontSize;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  bg_opacity?: number;

  @IsOptional()
  @IsString()
  bg_color?: string;

  @IsOptional()
  @IsString()
  font_color?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  message_duration?: number;

  @IsOptional()
  @IsBoolean()
  show_badges?: boolean;
}
