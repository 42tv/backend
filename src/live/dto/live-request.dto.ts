import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

/**
 * 실시간 방송 추천 요청 DTO
 */
export class RecommendLiveStreamDto {
  @ApiProperty({
    description: '추천할 방송자의 user_idx',
    example: 5,
  })
  @IsNumber()
  @IsNotEmpty()
  broadcaster_idx: number;
}
