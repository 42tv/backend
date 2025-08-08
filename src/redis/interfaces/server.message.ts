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
