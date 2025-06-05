import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class FanLevelItem {
  @ApiProperty({ description: '팬 레벨 이름' })
  @IsString()
  name: string;

  @ApiProperty({ description: '레벨 달성에 필요한 최소 도네이션 금액' })
  @IsNumber()
  min_donation: number;
}

export class UpdateFanLevelDto {
  @ApiProperty({ description: '팬 레벨 정보 배열', type: [FanLevelItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FanLevelItem)
  levels: FanLevelItem[];
}
