import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToBlacklistDto {
  @ApiProperty({ description: '차단할 사용자의 ID', example: 'user123' })
  @IsString()
  @IsNotEmpty()
  blocked_user_id: string;
}

export class RemoveFromBlacklistDto {
  @ApiProperty({ description: '차단 해제할 사용자의 ID', example: 'user123' })
  @IsString()
  @IsNotEmpty()
  blocked_user_id: string;
}
