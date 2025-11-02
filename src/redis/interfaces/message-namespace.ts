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
  DonationPayload,
  FanLevelUpPayload,
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
    profileImg: string,
    role: 'broadcaster' | 'manager' | 'member' | 'viewer' | 'guest',
    grade: string,
    color: string,
  ): ChatRoomMessage {
    return {
      op: OpCode.USER_JOIN,
      broadcaster_id: broadcasterId,
      payload: {
        user_id: userId,
        user_idx: userIdx,
        nickname,
        profile_img: profileImg,
        role,
        grade,
        color,
      } as UserJoinPayload,
    };
  },

  userLeave(
    broadcasterId: string,
    userId: string,
    userIdx: number,
    nickname: string,
    profileImg: string,
    role: 'broadcaster' | 'manager' | 'member' | 'viewer' | 'guest',
    grade: string,
    color: string,
  ): ChatRoomMessage {
    return {
      op: OpCode.USER_LEAVE,
      broadcaster_id: broadcasterId,
      payload: {
        user_id: userId,
        user_idx: userIdx,
        nickname,
        profile_img: profileImg,
        role,
        grade,
        color,
      } as UserLeavePayload,
    };
  },

  roleChange(
    broadcasterId: string,
    type: RoleChangeType,
    userIdx: number,
    userId: string,
    nickname: string,
    profile_img: string,
    fromRole: 'manager' | 'member' | 'viewer',
    toRole: 'manager' | 'member' | 'viewer',
    toGrade: string,
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
        profile_img: profile_img || '',
        from_role: fromRole,
        to_role: toRole,
        to_grade: toGrade,
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

  donation(
    broadcasterId: string,
    donationId: string,
    donorIdx: number,
    donorUserId: string,
    donorNickname: string,
    donorProfileImg: string,
    coinAmount: number,
    coinValue: number,
    message: string | null,
    donatedAt: string,
    fanLevel?: { name: string; color: string },
  ): ChatRoomMessage {
    return {
      op: OpCode.DONATION,
      broadcaster_id: broadcasterId,
      payload: {
        donation_id: donationId,
        donor_idx: donorIdx,
        donor_user_id: donorUserId,
        donor_nickname: donorNickname,
        donor_profile_img: donorProfileImg,
        coin_amount: coinAmount,
        coin_value: coinValue,
        message,
        donated_at: donatedAt,
        fan_level: fanLevel,
      } as DonationPayload,
    };
  },

  fanLevelUp(
    broadcasterId: string,
    fanIdx: number,
    fanUserId: string,
    fanNickname: string,
    fanProfileImg: string,
    oldLevel: { name: string; color: string } | null,
    newLevel: { name: string; color: string },
    totalDonation: number,
    donationId: string,
    upgradedAt: string,
  ): ChatRoomMessage {
    return {
      op: OpCode.FAN_LEVEL_UP,
      broadcaster_id: broadcasterId,
      payload: {
        fan_idx: fanIdx,
        fan: {
          user_id: fanUserId,
          nickname: fanNickname,
          profile_img: fanProfileImg,
        },
        old_level: oldLevel,
        new_level: newLevel,
        total_donation: totalDonation,
        triggered_by_donation_id: donationId,
        upgraded_at: upgradedAt,
      } as FanLevelUpPayload,
    };
  },
};
