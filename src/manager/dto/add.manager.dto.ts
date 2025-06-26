import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class AddManagerDto {
  @IsString()
  @IsNotEmpty()
  @Length(4, 20)
  @ApiProperty({
    example: '3333',
    not: null,
    description: '매니저의 아이디',
  })
  userId: string;
}
