import { IsOptional, IsDateString } from 'class-validator';

export class GetRankingQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
