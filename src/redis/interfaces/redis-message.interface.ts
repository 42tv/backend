export enum OpCode {
  CHAT = 'chat',
  RECOMMEND = 'recommend',
  BOOKMARK = 'bookmark',
  USER_JOIN = 'join',
  USER_LEAVE = 'leave',
  ROLE_CHANGE = 'role_change',
  VIEWER_COUNT = 'viewer_count',
}

// Redis 메시지의 기본 인터페이스
export interface ChatRoomMessage<T> {
  op: OpCode;
  broadcasterId: string;
  payload: T;
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
}




// // 채팅 메시지 타입
// export interface RoomChatMessage extends BaseRedisMessage {
//   type: 'chat';
//   chatter_idx: number;
//   chatter_user_id: string;
//   chatter_nickname: string;
//   chatter_message: string;
//   grade: string;
//   color: string;
//   role: string;
// }

// // 시청자 수 업데이트 메시지 타입
// export interface ViewerCountMessage extends BaseRedisMessage {
//   type: 'viewer_count';
//   viewer_cnt: number;
// }

// // 추천 메시지 타입
// export interface RecommendMessage extends BaseRedisMessage {
//   type: 'recommend';
//   recommender_idx: number;
//   recommender_nickname: string;
// }

// // 북마크 메시지 타입
// export interface BookmarkMessage extends BaseRedisMessage {
//   type: 'bookmark';
//   action: 'add' | 'delete';
//   user_idx: number;
// }

// // 사용자 입장/퇴장 메시지 타입
// export interface UserJoinLeaveMessage extends BaseRedisMessage {
//   type: 'join' | 'leave';
//   user_id: string;
//   user_idx: number;
//   nickname: string;
//   role: string;
// }

// // 사용자 변경 기본 메시지
// export interface BaseUserChangeMessage extends BaseRedisMessage {
//   target_user_id: string;
//   target_user_idx: number;
//   target_nickname: string;
// }

// // 사용자 역할 변경 메시지 타입
// export interface RoleChangeMessage extends BaseUserChangeMessage {
//   type: 'role_change';
//   previous_role: string;
//   new_role: string;
//   changed_by_idx: number;
//   changed_by_nickname: string;
// }

// // 사용자 등급 변경 메시지 타입
// export interface GradeChangeMessage extends BaseUserChangeMessage {
//   type: 'grade_change';
//   previous_grade: string;
//   new_grade: string;
// }

// 서버 커맨드 메시지 타입
export interface ServerCommandMessage {
  command: 'delete';
  prev_server_id: number;
  room_id: string;
  user_id: string;
}

// 시청자 정보 타입
export interface ViewerInfo {
  user_id: string;
  user_idx: number;
  nickname: string;
  role: string;
}

// // Redis 채널별 메시지 타입 유니언
// export type RoomMessage = 
//   | RoomChatMessage 
//   | ViewerCountMessage 
//   | RecommendMessage 
//   | BookmarkMessage
//   | UserJoinLeaveMessage
//   | RoleChangeMessage
//   | GradeChangeMessage;

// export type RedisMessage = RoomMessage | ServerCommandMessage;
