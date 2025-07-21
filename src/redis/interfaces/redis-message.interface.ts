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

// Redis 메시지의 기본 인터페이스
export interface ChatRoomMessage{
  op: OpCode;
  broadcasterId: string;
  payload: ChatPayLoad | RecommendPayload | ViewerCountPayload | BookmarkPayload | UserJoinPayload | UserLeavePayload | RoleChangePayload | KickPayload | BanPayload;
}

export interface ChatPayLoad {
  userIdx: number;
  userId: string;
  nickname: string;
  message: string;
  grade: string;
  color: string;
  role: string;
}

export interface RecommendPayload {
  userIdx: number;
  nickname: string;
}

export interface ViewerCountPayload {
  viewerCount: number;
}

export interface BookmarkPayload {
  action: 'add' | 'delete';
  userIdx: number;
}

export interface UserJoinPayload {
  userId: string;
  userIdx: number;
  nickname: string;
  role: string;
}

export interface UserLeavePayload {
  userId: string;
  userIdx: number;
  nickname: string;
  role: string;
}

export interface RoleChangePayload {
  userId: string;
  userIdx: number;
  nickname: string;
  role: {
    idx: number;
    user_id: string;
    nickname: string;
    role: 'broadcaster' | 'manager' | 'member' | 'viewer' | 'guest';
    profile_img: string;
    is_guest: boolean;
    guest_id?: string;
  }
  changedBy: {
    idx: number;
    user_id: string;
    nickname: string;
  }
}

export interface KickPayload {
  userId: string;
  userIdx: number;
  nickname: string;
  kickedBy: {
    idx: number;
    user_id: string;
    nickname: string;
  };
}

export interface BanPayload {
  userId: string;
  userIdx: number;
  nickname: string;
  bannedBy: {
    idx: number;
    user_id: string;
    nickname: string;
  };
}

// // 서버 커맨드 메시지 타입
// export interface ServerCommandMessage {
//   command: 'delete';
//   prev_server_id: number;
//   room_id: string;
//   user_id: string;
// }


