import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Length(4, 20)
  id: string;

  @IsString()
  @IsNotEmpty()
  //비밀번호 8자리 이상 알파벳,숫자,특수문자 1개씩 이상
  // @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
  password: string;

  @IsString()
  @IsNotEmpty()
  nickname: string;
}
