import { IsEnum } from 'class-validator';
import { WidgetType } from '@prisma/client';

export class CreateWidgetTokenDto {
  @IsEnum(WidgetType)
  widget_type: WidgetType;
}
