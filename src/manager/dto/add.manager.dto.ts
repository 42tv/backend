import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

/**
 * 매니저 추가 요청 DTO
 */
export class AddManagerDto {
  @IsString()
  @IsNotEmpty()
  @Length(4, 20)
  @ApiProperty({
    description: '매니저로 추가할 사용자의 아이디',
    example: 'manager123',
  })
  userId: string;
}
