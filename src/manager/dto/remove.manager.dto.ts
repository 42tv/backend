import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

/**
 * 매니저 제거 요청 DTO
 */
export class RemoveManagerDto {
  @IsString()
  @IsNotEmpty()
  @Length(4, 20)
  @ApiProperty({
    description: '제거할 매니저의 사용자 아이디',
    example: 'manager123',
  })
  userId: string;
}
