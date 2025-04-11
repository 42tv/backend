import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, ValidateIf } from 'class-validator';

export class BroadcastSettingDto {
  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({
    description: '성인 방송 여부',
    example: true,
  })
  isAdult: boolean;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({
    description: '비밀번호 여부',
    example: true,
  })
  isPrivate: boolean;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty({
    description: '팬방 여부',
    example: true,
  })
  isFanClub: boolean;

  @ValidateIf((o) => o.isFanClub === true)
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    description: '팬 레벨',
    example: 1,
  })
  fanLevel: number;
}
