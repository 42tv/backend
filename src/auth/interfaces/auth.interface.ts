export interface AuthenticatedUser {
  idx: number;
  user_id: string;
  nickname: string;
  profile_img: string;
  oauth_provider: string;
  oauth_provider_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface JwtPayload {
  sub?: number; // JWT 표준 subject claim
  idx?: number;
  user_id?: string;
  nickname?: string;
  profile_img?: string;
  is_guest: boolean;
  guest_id?: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface PlayToken {
  token: string;
}

export interface PhoneVerificationPayload {
  phone: string;
  code: string;
}
