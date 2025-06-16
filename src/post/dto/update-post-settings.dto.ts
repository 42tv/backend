import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdatePostSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @ApiProperty({
    description: '최소 팬 레벨 순위 (1~5)',
    example: 3,
    minimum: 1,
    maximum: 5,
    required: false,
  })
  minFanLevel?: number;
}
