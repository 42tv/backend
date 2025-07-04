import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ 
    description: 'JWT 리프레시 토큰', 
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: true 
  })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}
