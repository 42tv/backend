import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Length(4, 20)
  @Matches(/^[a-zA-Z0-9]*$/) //영문,숫자만 허용
  @ApiProperty({
    example: 'user123',
    minLength: 4,
    maxLength: 20,
    not: null,
    description: '아이디',
  })
  id: string;

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
  @Length(1, 10)
  @ApiProperty({
    example: 'nickname123',
    not: null,
    description: '닉네임',
  })
  nickname: string;
}
