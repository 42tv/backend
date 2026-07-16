import { ApiProperty } from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

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
  // 비밀번호 8자리 이상, 알파벳, 숫자, 특수문자 1개씩 이상 포함
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/)
  @ApiProperty({
    example: 'password123!',
    not: null,
    pattern: '^(?=.*[A-Za-z])(?=.*\\d)(?=.*[\\W_])[A-Za-z\\d\\W_]{8,}$',
    minLength: 8,
    description: '8자리 이상, 알파벳, 숫자, 특수문자 1개씩 포함',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 14)
  @ApiProperty({
    example: 'nickname123',
    not: null,
    description: '닉네임',
  })
  nickname: string;

  @IsBoolean()
  @Equals(true, { message: '이용약관에 동의해야 가입할 수 있습니다.' })
  @ApiProperty({
    example: true,
    description: '이용약관 동의 (필수)',
  })
  termsAgreed: boolean;

  @IsBoolean()
  @Equals(true, {
    message: '개인정보 수집·이용에 동의해야 가입할 수 있습니다.',
  })
  @ApiProperty({
    example: true,
    description: '개인정보 수집·이용 동의 (필수)',
  })
  privacyAgreed: boolean;

  // 개인정보보호법 §22의2 — 만 14세 미만은 법정대리인 동의 없이 가입 불가
  @IsBoolean()
  @Equals(true, { message: '만 14세 이상만 가입할 수 있습니다.' })
  @ApiProperty({
    example: true,
    description: '만 14세 이상 확인 (필수)',
  })
  isOver14: boolean;
}
