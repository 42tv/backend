import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { GoalWidgetStyle } from '@prisma/client';

export class UpdateGoalConfigDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(GoalWidgetStyle)
  style?: GoalWidgetStyle;

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
}
