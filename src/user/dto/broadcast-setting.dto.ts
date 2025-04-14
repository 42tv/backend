import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class BroadcastSettingDto {
  @IsNotEmpty()
  @IsString()
  @Length(1, 30)
  @ApiProperty({
    description: '방송 제목',
    example: '방송 제목',
  })
  title: string;

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
  @Min(1)
  @Max(5)
  @ApiProperty({
    description: '팬 레벨',
    example: 1,
  })
  fanLevel: number;

  @ValidateIf((o) => o.isPrivate === true)
  @IsNotEmpty()
  @IsString()
  @Length(4, 8)
  @ApiProperty({
    description: '비밀번호',
    example: '1234',
  })
  password: string;
}
