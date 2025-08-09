import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * 시청자 kick 요청 DTO
 */
export class KickViewerDto {
  @ApiProperty({
    description: 'kick할 시청자의 user_id 또는 guest_id',
    example: 'viewer123',
  })
  @IsString()
  @IsNotEmpty()
  viewer_id: string;

  @ApiProperty({
    description: 'kick 사유 (선택사항)',
    example: '채팅 규칙 위반',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
