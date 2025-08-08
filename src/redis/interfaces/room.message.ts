export enum OpCode {
  CHAT = 'chat',
  KICK = 'kick',
  BAN = 'ban',
  RECOMMEND = 'recommend',
  BOOKMARK = 'bookmark',
  USER_JOIN = 'join',
  USER_LEAVE = 'leave',
  ROLE_CHANGE = 'role_change',
  VIEWER_COUNT = 'viewer_count',
}

export interface JwtDecode {
  idx: number;
  user_id: string;
  nickname: string;
  role: 'broadcaster' | 'manager' | 'member' | 'viewer' | 'guest';
  profile_img: string;
  is_guest: boolean;
  guest_id?: string;
  fan_level?: {
    name: string;
    color: string;
    total_donation: number;
  }; // 팬 레벨 정보 (게스트가 아닌 경우에만 존재)
}

// Redis 메시지의 기본 인터페이스
export interface ChatRoomMessage {
  op: OpCode;
  broadcaster_id: string;
  payload:
    | ChatPayload
    | RecommendPayload
    | ViewerCountPayload
    | BookmarkPayload
    | UserJoinPayload
    | UserLeavePayload
    | RoleChangePayload
    | KickPayload
    | BanPayload;
}

export interface ChatPayload {
  user_idx: number;
  user_id: string;
  nickname: string;
  message: string;
  profile_img: string;
  role: 'broadcaster' | 'manager' | 'member' | 'viewer' | 'guest';
  grade: string;
  color: string;
}

export interface RecommendPayload {
  user_idx: number;
  nickname: string;
}

export interface ViewerCountPayload {
  viewer_count: number;
}

export interface BookmarkPayload {
  action: 'add' | 'delete';
  user_idx: number;
}

export interface UserJoinPayload {
  user_id: string;
  user_idx: number;
  nickname: string;
  jwt_decode: JwtDecode;
}

export interface UserLeavePayload {
  user_id: string;
  user_idx: number;
  nickname: string;
  jwt_decode: JwtDecode;
}

export interface RoleChangePayload {
  user_id: string;
  user_idx: number;
  nickname: string;
  jwt_decode: JwtDecode;
  changed_by: {
    idx: number;
    user_id: string;
    nickname: string;
  };
}

export interface KickPayload {
  user_id: string;
  user_idx: number;
  nickname: string;
  kicked_by: {
    idx: number;
    user_id: string;
    nickname: string;
  };
}

export interface BanPayload {
  user_id: string;
  user_idx: number;
  nickname: string;
  banned_by: {
    idx: number;
    user_id: string;
    nickname: string;
  };
}

// 시청자 정보 타입
export interface ViewerInfo {
  user_id: string;
  user_idx: number;
  nickname: string;
  jwtDecode: JwtDecode;
}

// // 서버 커맨드 메시지 타입
// export interface ServerCommandMessage {
//   command: 'delete';
//   prev_server_id: number;
//   room_id: string;
//   user_id: string;
// }
