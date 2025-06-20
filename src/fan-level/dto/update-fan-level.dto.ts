import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString, ValidateNested, IsOptional, Matches } from 'class-validator';
import { Type } from 'class-transformer';

class FanLevelItem {
  @ApiProperty({ description: '팬 레벨 이름' })
  @IsString()
  name: string;

  @ApiProperty({ description: '레벨 달성에 필요한 최소 도네이션 금액' })
  @IsNumber()
  min_donation: number;

  @ApiProperty({ description: '팬 레벨 색상 (헥스 코드)', example: '#FF5733', required: false })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: '색상은 #으로 시작하는 6자리 헥스 코드여야 합니다. (예: #FF5733)' })
  color: string;
}

export class UpdateFanLevelDto {
  @ApiProperty({ description: '팬 레벨 정보 배열', type: [FanLevelItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FanLevelItem)
  levels: FanLevelItem[];
}
