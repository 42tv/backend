import {
  ViewerCountMessage,
  RecommendMessage,
  BookmarkMessage,
  RoomChatMessage,
  ServerCommandMessage,
  UserJoinLeaveMessage,
  RoleChangeMessage,
  GradeChangeMessage,
} from './redis-message.interface';

export namespace RedisMessages {
  export function viewerCount(broadcaster_id: string, viewer_cnt: number): ViewerCountMessage {
    return {
      type: 'viewer_count',
      broadcaster_id,
      viewer_cnt,
    };
  }

  export function recommend(
    broadcaster_id: string,
    recommender_idx: number,
    recommender_nickname: string
  ): RecommendMessage {
    return {
      type: 'recommend',
      broadcaster_id,
      recommender_idx,
      recommender_nickname,
    };
  }

  export function bookmark(
    broadcaster_id: string,
    action: 'add' | 'delete',
    user_idx: number
  ): BookmarkMessage {
    return {
      type: 'bookmark',
      broadcaster_id,
      action,
      user_idx,
    };
  }

  export function chat(
    broadcaster_id: string,
    chatter_idx: number,
    chatter_user_id: string,
    chatter_nickname: string,
    chatter_message: string,
    grade: string,
    color: string,
    role: string
  ): RoomChatMessage {
    return {
      type: 'chat',
      broadcaster_id,
      chatter_idx,
      chatter_user_id,
      chatter_nickname,
      chatter_message,
      grade,
      color,
      role,
    };
  }

  export function serverCommand(
    prev_server_id: number,
    room_id: string,
    user_id: string
  ): ServerCommandMessage {
    return {
      command: 'delete',
      prev_server_id,
      room_id,
      user_id,
    };
  }

  export function userJoinLeave(
    type: 'join' | 'leave',
    broadcaster_id: string,
    user_id: string,
    user_idx: number,
    nickname: string,
    role: string
  ): UserJoinLeaveMessage {
    return {
      type,
      broadcaster_id,
      user_id,
      user_idx,
      nickname,
      role,
    };
  }

  export function roleChange(
    broadcaster_id: string,
    target_user_id: string,
    target_user_idx: number,
    target_nickname: string,
    previous_role: string,
    new_role: string,
    changed_by_idx: number,
    changed_by_nickname: string
  ): RoleChangeMessage {
    return {
      type: 'role_change',
      broadcaster_id,
      target_user_id,
      target_user_idx,
      target_nickname,
      previous_role,
      new_role,
      changed_by_idx,
      changed_by_nickname,
    };
  }

  export function gradeChange(
    broadcaster_id: string,
    target_user_id: string,
    target_user_idx: number,
    target_nickname: string,
    previous_grade: string,
    new_grade: string
  ): GradeChangeMessage {
    return {
      type: 'grade_change',
      broadcaster_id,
      target_user_id,
      target_user_idx,
      target_nickname,
      previous_grade,
      new_grade,
    };
  }
}
