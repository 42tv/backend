import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class DeleteAccountDto {
  @IsOptional()
  @IsString()
  password?: string; // 일반 계정 본인 재확인용

  @IsOptional()
  @IsBoolean()
  confirm?: boolean; // OAuth 계정(비밀번호 없음) 확인용
}
