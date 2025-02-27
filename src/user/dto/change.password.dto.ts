import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  //비밀번호 8자리 이상 알파벳,숫자,특수문자 1개씩 이상
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
  @ApiProperty({
    example: 'password123!',
    not: null,
    pattern: '^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
    minLength: 8,
    description: '8자리 이상 알파벳,숫자,특수문자 1개씩 이상',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  //비밀번호 8자리 이상 알파벳,숫자,특수문자 1개씩 이상
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
  @ApiProperty({
    example: 'password123!',
    not: null,
    pattern: '^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
    minLength: 8,
    description: '8자리 이상 알파벳,숫자,특수문자 1개씩 이상',
  })
  new_password: string;
}
