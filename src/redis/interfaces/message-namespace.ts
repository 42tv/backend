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
  RoleChangeType,
  KickPayload,
  KickedPayload,
  BanPayload,
  JwtDecode,
} from './room.message';
import {
  DuplicateConnectPayload,
  ServerMessage,
  ServerOpCode,
} from './server.message';

export const RedisMessages = {
  viewerCount(broadcasterId: string, viewerCount: number): ChatRoomMessage {
    return {
      op: OpCode.VIEWER_COUNT,
      broadcaster_id: broadcasterId,
      payload: { viewer_count: viewerCount } as ViewerCountPayload,
    };
  },

  recommend(
    broadcasterId: string,
    user_idx: number,
    nickname: string,
  ): ChatRoomMessage {
    return {
      op: OpCode.RECOMMEND,
      broadcaster_id: broadcasterId,
      payload: { user_idx, nickname } as RecommendPayload,
    };
  },

  bookmark(
    broadcasterId: string,
    action: 'add' | 'delete',
    userIdx: number,
  ): ChatRoomMessage {
    return {
      op: OpCode.BOOKMARK,
      broadcaster_id: broadcasterId,
      payload: { action, user_idx: userIdx } as BookmarkPayload,
    };
  },

  chat(
    broadcasterId: string,
    userIdx: number,
    userId: string,
    nickname: string,
    message: string,
    profile_img: string,
    role: 'broadcaster' | 'manager' | 'member' | 'viewer' | 'guest',
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
        profile_img,
        role,
        grade,
        color,
      } as ChatPayload,
    };
  },

  userJoin(
    broadcasterId: string,
    userId: string,
    userIdx: number,
    nickname: string,
    jwtDecode: JwtDecode,
  ): ChatRoomMessage {
    return {
      op: OpCode.USER_JOIN,
      broadcaster_id: broadcasterId,
      payload: {
        user_id: userId,
        user_idx: userIdx,
        nickname,
        jwt_decode: jwtDecode,
      } as UserJoinPayload,
    };
  },

  userLeave(
    broadcasterId: string,
    userId: string,
    userIdx: number,
    nickname: string,
    jwtDecode: JwtDecode,
  ): ChatRoomMessage {
    return {
      op: OpCode.USER_LEAVE,
      broadcaster_id: broadcasterId,
      payload: {
        user_id: userId,
        user_idx: userIdx,
        nickname,
        jwt_decode: jwtDecode,
      } as UserLeavePayload,
    };
  },

  roleChange(
    broadcasterId: string,
    type: RoleChangeType,
    userIdx: number,
    userId: string,
    nickname: string,
    fromRole: 'manager' | 'member' | 'viewer',
    toRole: 'manager' | 'member' | 'viewer',
    toColor: string,
  ): ChatRoomMessage {
    return {
      op: OpCode.ROLE_CHANGE,
      broadcaster_id: broadcasterId,
      payload: {
        type,
        user_idx: userIdx,
        user_id: userId,
        nickname,
        from_role: fromRole,
        to_role: toRole,
        to_color: toColor,
      } as RoleChangePayload,
    };
  },

  kick(
    broadcasterId: string,
    userId: string,
    userIdx: number,
    nickname: string,
    kickedBy: KickPayload['kicked_by'],
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
  },

  kicked(
    broadcasterId: string,
    userId: string,
    userIdx: number,
    nickname: string,
    kickedBy: KickedPayload['kicked_by'],
    reason?: string,
  ): ChatRoomMessage {
    return {
      op: OpCode.KICKED,
      broadcaster_id: broadcasterId,
      payload: {
        user_id: userId,
        user_idx: userIdx,
        nickname,
        kicked_by: kickedBy,
        reason,
      } as KickedPayload,
    };
  },

  ban(
    broadcasterId: string,
    userId: string,
    userIdx: number,
    nickname: string,
    bannedBy: BanPayload['banned_by'],
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
  },

  duplicateConnect(
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
  },
};
