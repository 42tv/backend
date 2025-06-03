import { Inject, forwardRef } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';
import { StreamViewerService } from 'src/stream-viewer/stream-viewer.service';
import { RedisService } from 'src/redis/redis.service';
import { ServerCommand } from 'src/utils/utils';
import { StreamService } from 'src/stream/stream.service';

interface JwtPayload {
  broadcaster_idx: number;
  broadcaster_id: string;
  broadcaster_nickname: string;
  type: string;
  user_idx: number;
  user_id: string;
  stream_idx: number;
  stream_id: string;
  guest_uuid: string;
}

interface AuthenticatedSocket extends Socket {
  user: JwtPayload;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'chat',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly authService: AuthService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => RedisService))
    private readonly redisService: RedisService,
    private readonly streamService: StreamService,
  ) {}

  @WebSocketServer()
  server: Server;
  private chatRooms = new Map<string, Map<string, AuthenticatedSocket>>();

  /**
   * client.user 에 jwt valdiate해서 넣어줌
   * @param server
   */
  afterInit(server: Server) {
    server.use(async (socket: Socket, next) => {
      try {
        const authHeader = socket.handshake.auth.token || socket.handshake.headers['authorization']; // "Bearer <token>"
        if (!authHeader) {
          return next(new Error('인증 헤더가 없습니다.'));
        }
        const token = authHeader.split(' ')[1];
        console.log(token);
        if (!token) {
          return next(new Error('토큰이 없습니다.'));
        }
        const payload: JwtPayload = await this.authService.validate(token);
        // TypeScript 용으로 socket에 프로퍼티 추가
        (socket as any).user = payload;
        next();
      } catch (err) {
        // authService.validate에서 발생한 오류 또는 기타 오류 처리
        if (err instanceof Error && err.message === '이미 시청중인 방송입니다') {
          next(err);
        } else {
          next(new Error('인증 실패'));
        }
      }
    });
  }

  /**
   * room에 메세지 보내기
   * @param broadcasterId 스트리머 idx
   * @param eventName 메세지 이벤트 이름
   * @param data 메세지 데이터
   */
  async sendToRoom(broadcasterId: string, eventName: string, data: any) {
    console.log(broadcasterId, eventName, data);
    this.server.to(broadcasterId).emit(eventName, data);
  }

  /**
   * 소켓 연결시
   * @param client
   * @returns
   */
  async handleConnection(client: AuthenticatedSocket) {
    // 구조분해 할당
    const { broadcaster_id, stream_idx, type, user_idx, user_id, guest_uuid } =
      client.user;
    console.log(broadcaster_id, stream_idx, type, user_idx, guest_uuid);
    
    const registerId = user_id || guest_uuid;

    // 자기 서버에 이미 접속중이라면 클라이언트에 중복 접속금지 알림
    if (this.chatRooms.has(broadcaster_id)) {
      const roomMap = this.chatRooms.get(broadcaster_id);
      if (roomMap.has(registerId)) {
        const existingClient = roomMap.get(registerId);
        if (existingClient) {
          console.log(`Duplicate user(${existingClient.id}) leaved ${broadcaster_id}`);
          existingClient.emit('duplicate_connection', {
            message: '다른 클라이언트에서 접속하였습니다',
          });
          existingClient.leave(broadcaster_id); // 기존 소켓을 룸에서 제거
          roomMap.delete(registerId); // 기존 소켓 제거
        }
      }
    }
    // chatRoom에 사용자 추가
    await this.addChatRoomUser(broadcaster_id, registerId, client)
    // redis에 connection을 자신으로 덮어씌우고, 만약 다른서버에 존재한다면 해당 서버에 없애라고 pub날림
    await this.redisService.registConnection(broadcaster_id, registerId);
    await this.redisService.registViewer(broadcaster_id, registerId);
    
  }

  /**
   * 소케 연결 종료시
   * @param client
   * @returns
   */
  async handleDisconnect(client: AuthenticatedSocket) {
    // 구조분해 할당
    const { broadcaster_id, stream_idx, type, user_idx, user_id, guest_uuid } =
      client.user;
    const registerId = user_id || guest_uuid;
    
    // 자신의 서버에 연결된 유저가 나갔을때만 redis에서 key삭제
    if (this.chatRooms.has(broadcaster_id)) {
      if (this.chatRooms.get(broadcaster_id).has(registerId)) {
        // Redis에서 연결 정보 삭제
        console.log(`redis에서 연결 정보 삭제: con:${broadcaster_id}:${registerId}`);
        await this.redisService.removeConnection(broadcaster_id, registerId);
        await this.redisService.removeViewer(broadcaster_id, registerId);
      }
    }
    await this.deleteChatRoomUser(broadcaster_id, registerId);
    
  }

  /**
   * chatRoom에 사용자 추가
   * 만약 chatRoom에 없다면 새로 생성하고 redis에 subscribe
   * @param broadcasterId 
   * @param userId 
   * @param client 
   */
  async addChatRoomUser(
    broadcasterId: string,
    userId: string,
    client: AuthenticatedSocket

  ) {
    if (!this.chatRooms.has(broadcasterId)) {
      console.log(`[Create] - chatRoom[${broadcasterId}]: ${broadcasterId}`);
      this.chatRooms.set(broadcasterId, new Map<string, AuthenticatedSocket>());
      await this.redisService.subscribe(`room:${broadcasterId}`)
    }
    this.chatRooms.get(broadcasterId).set(userId, client);
    client.join(broadcasterId);
  }

  /**
   * chatRoom에서 사용자 제거 후 사이즈가 0이라면 chatRoom에서 제거 후 unsubscribe
   * @param broadcasterId 
   * @param userId 
   */
  async deleteChatRoomUser(
    broadcasterId: string,
    userId: string,
  ) {
    // 자신의 서버에 채팅방이 존재하는지 확인
    if (this.chatRooms.has(broadcasterId)) {
      const roomMap = this.chatRooms.get(broadcasterId);
      
      // 해당 user_id가 채팅방에 존재하는지 확인
      if (roomMap.has(userId)) {
        // 채팅방 떠남
        console.log(`[Leave User] - room: ${broadcasterId}, user: ${userId}, prev_server_id: ${this.redisService.getServerId()}`);
        roomMap.get(userId).leave(broadcasterId);
        // 채팅방에서 사용자 제거
        roomMap.delete(userId);
        // 만약 채팅방에 아무도 없다면 채팅방 자체를 제거하고 Redis 구독 해제
        if (roomMap.size === 0) {
          console.log(`[Delete] - chatRoom[${broadcasterId}]:${userId}`);
          this.chatRooms.delete(broadcasterId);
          await this.redisService.unsubscribe(`room:${broadcasterId}`);
        }
      }
    }
  }

  /**
   * Redis로부터 받은 Server Command를 처리한다.
   * 다른 서버를 통해 중복처리 되었을때만 ServerCommand의 'delete'로 제거한다
   */
  async handleServerCommmand(message: ServerCommand) {
    console.log(message.command == 'delete')
    if (message.command == 'delete') {
      const { prev_server_id, room_id, user_id } = message;
      if (this.chatRooms.has(room_id)) {
        console.log(`[ServerCommand Delete] - chatRoom[${room_id}]:${user_id}`);
        this.chatRooms.get(room_id).get(user_id).emit('duplicate_connection', {
          message: '다른 클라이언트에서 접속하였습니다',
        });
      }
      // 해당 채팅방에서 사용자 제거
      await this.deleteChatRoomUser(room_id, user_id);
    }
  }
}
