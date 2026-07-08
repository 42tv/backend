import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AdminUpdateNicknameDto {
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class AdminToggleAdminRoleDto {
  @IsBoolean()
  isAdmin: boolean;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class AdminUserActionReasonDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
