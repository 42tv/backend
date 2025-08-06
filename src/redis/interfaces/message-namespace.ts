import { 
  OpCode, 
  ChatRoomMessage, 
  ChatPayload, 
  RecommendPayload, 
  ViewerCountPayload, 
  BookmarkPayload, 
  UserJoinPayload, 
  UserLeavePayload, 
  RoleChangePayload, 
  KickPayload, 
  BanPayload,
  JwtDecode, 
} from './room.message';
import { DuplicateConnectPayload, ServerMessage, ServerOpCode } from './server.message';

export namespace RedisMessages {
  export function viewerCount(broadcasterId: string, viewerCount: number): ChatRoomMessage {
    return {
      op: OpCode.VIEWER_COUNT,
      broadcaster_id: broadcasterId,
      payload: { viewer_count: viewerCount } as ViewerCountPayload,
    };
  }

  export function recommend(broadcasterId: string, user_idx: number, nickname: string): ChatRoomMessage {
    return {
      op: OpCode.RECOMMEND,
      broadcaster_id: broadcasterId,
      payload: { user_idx, nickname } as RecommendPayload,
    };
  }

  export function bookmark(
    broadcasterId: string,
    action: 'add' | 'delete',
    userIdx: number
  ): ChatRoomMessage {
    return {
      op: OpCode.BOOKMARK,
      broadcaster_id: broadcasterId,
      payload: { action, user_idx: userIdx } as BookmarkPayload,
    };
  }

  export function chat(
    broadcasterId: string,
    userIdx: number,
    userId: string,
    nickname: string,
    message: string,
    grade: string,
    color: string,
  ): ChatRoomMessage {
    return {
      op: OpCode.CHAT,
      broadcaster_id: broadcasterId,
      payload: {
        user_idx: userIdx,
        user_id: userId,
        nickname,
        message,
        grade,
        color,
      } as ChatPayload,
    };
  }

  export function userJoin(
    broadcasterId: string,
    userId: string,
    userIdx: number,
    nickname: string,
    jwtDecode: JwtDecode
  ): ChatRoomMessage {
    return {
      op: OpCode.USER_JOIN,
      broadcaster_id: broadcasterId,
      payload: { user_id: userId, user_idx: userIdx, nickname, jwt_decode: jwtDecode } as UserJoinPayload,
    };
  }

  export function userLeave(
    broadcasterId: string,
    userId: string,
    userIdx: number,
    nickname: string,
    jwtDecode: JwtDecode
  ): ChatRoomMessage {
    return {
      op: OpCode.USER_LEAVE,
      broadcaster_id: broadcasterId,
      payload: { user_id: userId, user_idx: userIdx, nickname, jwt_decode: jwtDecode } as UserLeavePayload,
    };
  }

  export function roleChange(
    broadcasterId: string,
    userId: string,
    userIdx: number,
    nickname: string,
    jwtDecode: JwtDecode,
    changedBy: RoleChangePayload['changed_by']
  ): ChatRoomMessage {
    return {
      op: OpCode.ROLE_CHANGE,
      broadcaster_id: broadcasterId,
      payload: {
        user_id: userId,
        user_idx: userIdx,
        nickname,
        jwt_decode: jwtDecode,
        changed_by: changedBy,
      } as RoleChangePayload,
    };
  }

  export function kick(
    broadcasterId: string,
    userId: string,
    userIdx: number,
    nickname: string,
    kickedBy: KickPayload['kicked_by']
  ): ChatRoomMessage {
    return {
      op: OpCode.KICK,
      broadcaster_id: broadcasterId,
      payload: {
        user_id: userId,
        user_idx: userIdx,
        nickname,
        kicked_by: kickedBy,
      } as KickPayload,
    };
  }

  export function ban(
    broadcasterId: string,
    userId: string,
    userIdx: number,
    nickname: string,
    bannedBy: BanPayload['banned_by']
  ): ChatRoomMessage {
    return {
      op: OpCode.BAN,
      broadcaster_id: broadcasterId,
      payload: {
        user_id: userId,
        user_idx: userIdx,
        nickname,
        banned_by: bannedBy,
      } as BanPayload,
    };
  }

  export function duplicateConnect(
    serverId: number,
    roomId: string,
    disconnectId: string,
  ): ServerMessage {
    return {
      op: ServerOpCode.DUPLICATE_CONNECT,
      serverId,
      payload: {
        roomId: roomId,
        disconnectId: disconnectId,
      } as DuplicateConnectPayload,
    };
  }
}
  