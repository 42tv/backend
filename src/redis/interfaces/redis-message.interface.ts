// Redis 메시지의 기본 인터페이스
export interface BaseRedisMessage {
  type: string;
  broadcaster_id: string;
}

// 채팅 메시지 타입
export interface RoomChatMessage extends BaseRedisMessage {
  type: 'chat';
  chatter_idx: number;
  chatter_user_id: string;
  chatter_nickname: string;
  chatter_message: string;
  grade: string;
  color: string;
  role: string;
}

// 시청자 수 업데이트 메시지 타입
export interface ViewerCountMessage extends BaseRedisMessage {
  type: 'viewer_count';
  viewer_cnt: number;
}

// 추천 메시지 타입
export interface RecommendMessage extends BaseRedisMessage {
  type: 'recommend';
  recommender_idx: number;
  recommender_nickname: string;
}

// 북마크 메시지 타입
export interface BookmarkMessage extends BaseRedisMessage {
  type: 'bookmark';
  action: 'add' | 'delete';
  user_idx: number;
}

// 사용자 입장/퇴장 메시지 타입
export interface UserJoinLeaveMessage extends BaseRedisMessage {
  type: 'join' | 'leave';
  user_id: string;
  user_idx: number;
  nickname: string;
  role: string;
}

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

// Redis 채널별 메시지 타입 유니언
export type RoomMessage = 
  | RoomChatMessage 
  | ViewerCountMessage 
  | RecommendMessage 
  | BookmarkMessage
  | UserJoinLeaveMessage;

export type RedisMessage = RoomMessage | ServerCommandMessage;
