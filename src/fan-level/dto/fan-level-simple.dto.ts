import { ApiProperty } from '@nestjs/swagger';

/**
 * 팬 레벨 간단 정보 DTO (findByUserIdx 반환값용)
 */
export class FanLevelSimpleDto {
  @ApiProperty({
    description: '팬 레벨 ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '팬 레벨 이름',
    example: '브론즈',
  })
  name: string;

  @ApiProperty({
    description: '레벨 달성에 필요한 최소 도네이션 금액',
    example: 10000,
  })
  min_donation: number;

  @ApiProperty({
    description: '팬 레벨 색상 (헥스 코드)',
    example: '#CD7F32',
  })
  color: string;
}