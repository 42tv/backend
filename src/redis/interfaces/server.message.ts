export enum ServerOpCode {
  DUPLICATE_CONNECT = 'duplicate_connect',
}

export interface ServerMessage {
  op: ServerOpCode;
  serverId: number;
  payload: DuplicateConnectPayload;
}

export interface DuplicateConnectPayload {
  roomId: string;
  disconnectId: string;
}

// 전 서버 공통 관리자 커맨드 (admin_command 채널, 모든 서버가 구독)
export enum AdminOpCode {
  FORCE_LOGOUT = 'force_logout',
  GLOBAL_NOTICE = 'global_notice',
}

export interface AdminCommandMessage {
  op: AdminOpCode;
  payload: ForceLogoutPayload | GlobalNoticePayload;
}

export interface ForceLogoutPayload {
  user_id: string;
  user_idx: number;
  reason: string;
}

export interface GlobalNoticePayload {
  message: string;
  sent_at: string;
}
