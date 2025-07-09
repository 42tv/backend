import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

/**
 * 닉네임 변경 요청 DTO
 */
export class UpdateNicknameRequestDto {
  @ApiProperty({ 
    description: '변경할 닉네임', 
    example: '새닉네임',
    minLength: 2
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  nickname: string;
}

/**
 * 비밀번호 변경 요청 DTO
 */
export class UpdatePasswordRequestDto {
  @ApiProperty({ 
    description: '현재 비밀번호', 
    example: 'oldPassword123!' 
  })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ 
    description: '새 비밀번호 (8자리 이상, 알파벳, 숫자, 특수문자 포함)', 
    example: 'newPassword123!' 
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
