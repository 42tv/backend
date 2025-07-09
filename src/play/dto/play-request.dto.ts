import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

/**
 * 방송 시청 요청 DTO
 */
export class PlayStreamDto {
  @ApiProperty({
    description: '시청할 스트리머의 ID',
    example: 'streamer123'
  })
  @IsString()
  @IsNotEmpty()
  stream_id: string;

  @ApiProperty({
    description: '비밀번호가 설정된 방송의 경우 필요',
    example: '1234',
    required: false
  })
  @IsString()
  @IsOptional()
  password?: string;
}
