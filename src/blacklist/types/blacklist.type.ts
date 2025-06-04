import { User } from '@prisma/client';

export interface BlacklistWithBlocked {
  id: number;
  owner_idx: number;
  blocked_idx: number;
  created_at: Date;
  blocked?: {
    idx: number;
    user_id: string;
    nickname: string;
    profile_img: string;
  };
}
