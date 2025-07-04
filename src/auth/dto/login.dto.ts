import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({ 
    description: '사용자 ID', 
    example: 'user123',
    required: true 
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ 
    description: '비밀번호', 
    example: 'password123!',
    required: true 
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
