import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, Max } from 'class-validator';

/**
 * 쪽지 설정 업데이트 요청 DTO
 */
export class UpdatePostSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @ApiProperty({
    description: '최소 팬 레벨 제한 (1~5)',
    example: 3,
    minimum: 1,
    maximum: 5,
    required: false,
  })
  minFanLevel?: number;
}
