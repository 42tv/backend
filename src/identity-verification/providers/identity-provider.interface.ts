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
  echoed_request_id?: string;
}

export interface IdentityProviderInterface {
  verify(command: VerifyIdentityCommand): Promise<VerifyIdentityResult>;
  confirm(command: ConfirmIdentityCommand): Promise<ConfirmIdentityResult>;
}
