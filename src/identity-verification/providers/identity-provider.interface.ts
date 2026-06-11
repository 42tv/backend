export interface VerifyIdentityCommand {
  user_idx: number;
  phone?: string;
  code?: string;
}

export interface VerifyIdentityResult {
  verified: boolean;
  provider_ref?: string;
}

export interface ConfirmIdentityCommand {
  user_idx: number;
  request_id: string;
}

export interface ConfirmIdentityResult {
  verified: boolean;
  provider_ref?: string;
  ci?: string;
  birth_date?: string; // 'YYYY-MM-DD' — 성인 판정 후 폐기, 저장하지 않음
  echoed_request_id?: string;
}

export interface IdentityProviderInterface {
  verify(command: VerifyIdentityCommand): Promise<VerifyIdentityResult>;
  confirm(command: ConfirmIdentityCommand): Promise<ConfirmIdentityResult>;
}
