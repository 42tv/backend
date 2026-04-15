import { IsDateString, IsOptional, IsIn } from 'class-validator';

export class GetTrendQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  unit?: 'day' | 'week' | 'month';
}
