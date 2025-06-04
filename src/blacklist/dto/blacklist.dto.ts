import { IsNotEmpty, IsString, IsArray, ArrayMinSize } from 'class-validator';
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

export class RemoveMultipleFromBlacklistDto {
  @ApiProperty({ 
    description: '차단 해제할 사용자 ID 목록', 
    example: ['user1', 'user2', 'user3'],
    type: [String]
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  blocked_user_ids: string[];
}
