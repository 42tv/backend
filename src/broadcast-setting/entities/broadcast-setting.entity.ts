import { BroadcastSetting, User } from '@prisma/client';

export interface BroadcastSettingWithUser extends BroadcastSetting {
  User: User;
}

export interface BroadcastSettingResponse {
  id: number;
  user_idx: number;
  title: string;
  is_adult: boolean;
  is_pw: boolean;
  is_fan: boolean;
  fan_level: number | null;
  password: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface BroadcastSettingCreate {
  user_idx: number;
  user_id: string;
  title?: string;
}

export interface BroadcastSettingUpdate {
  title?: string;
  is_adult?: boolean;
  is_pw?: boolean;
  is_fan?: boolean;
  fan_level?: number;
  password?: string;
}

export interface BroadcastVisibilitySettings {
  isAdult: boolean;
  isPrivate: boolean;
  isFanClub: boolean;
  fanLevel?: number;
  password?: string;
}

export interface BroadcastPermissions {
  canView: boolean;
  canChat: boolean;
  canInteract: boolean;
  restrictions: string[];
}
