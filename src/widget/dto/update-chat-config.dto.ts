import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { ChatWidgetStyle } from '@prisma/client';

export class UpdateChatConfigDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
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
  @IsInt()
  @Min(10)
  @Max(100)
  font_size?: number;

  @IsOptional()
  @IsBoolean()
  show_user_id?: boolean;
}
