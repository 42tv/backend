export interface VerifyIdentityCommand {
  user_idx: number;
  phone?: string;
  code?: string;
}

export interface VerifyIdentityResult {
  verified: boolean;
  provider_ref?: string;
}

export interface IdentityProviderInterface {
  verify(command: VerifyIdentityCommand): Promise<VerifyIdentityResult>;
}
