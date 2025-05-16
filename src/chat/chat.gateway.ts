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

interface JwtPayload {
  broadcaster_idx: number;
  broadcaster_id: string;
  broadcaster_nickname: string;
  type: string;
  user_idx: number;
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
    private readonly streamViewerService: StreamViewerService,
    @Inject(forwardRef(() => RedisService))
    private readonly redisService: RedisService
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
        const authHeader = socket.handshake.auth.token; // "Bearer <token>"
        if (!authHeader) {
          return next(new Error('인증 헤더가 없습니다.'));
        }
        const token = authHeader.split(' ')[1];
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
  async sendMessageToRoom(broadcasterId: string, eventName: string, data: any) {
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
    const { broadcaster_id, stream_idx, type, user_idx, guest_uuid } =
      client.user;
    console.log(broadcaster_id, stream_idx, type, user_idx, guest_uuid);

    // Ensure room map exists and prevent duplicate connections
    if (!this.chatRooms.has(broadcaster_id)) {
      this.chatRooms.set(broadcaster_id, new Map<string, AuthenticatedSocket>());
    }
    const roomMap = this.chatRooms.get(broadcaster_id);
    const userKey = type === 'guest' ? guest_uuid : user_idx.toString();

    // 이미 연결된 웹소켓인 경우 기존 소켓을 제거함
    let isDuplicate = false;
    if (roomMap.has(userKey)) {
      // room에서 제거 
      const existedClient = roomMap.get(userKey);
      console.log(`Duplicate user(${existedClient.id}) leaved ${broadcaster_id}`);
      existedClient.emit('duplicate', {
        message: '이미 시청중인 방송입니다',
      })
      existedClient.leave(broadcaster_id);
      roomMap.delete(userKey);
      // 기존 연결된 애라면 DB를 바꿀 필요가 없음. Boolean 값으로 처리
      isDuplicate = true;
    }
    
    console.log(`Duplicate user(${client.id}) joined ${broadcaster_id}`);
    client.join(broadcaster_id);
    roomMap.set(userKey, client);

    // 기존에 있던 유저(웹소켓)이 아니라면 Map에 추가 및 DB에 추가
    if (!isDuplicate) {
      console.log(`isDuplicate: ${isDuplicate}`);
      console.log(`add client ${client.id} to room ${broadcaster_id}`);
      
      if (type === 'guest') {
        console.log(`Guest(${guest_uuid}) user connected ${broadcaster_id}`);
        await this.streamViewerService.addStreamViewer(
          stream_idx,
          undefined,
          guest_uuid,
        );
      } else if (type === 'member' || type === 'owner') {
        console.log(`Member(${user_idx}) user connected ${broadcaster_id}`);
        await this.streamViewerService.addStreamViewer(stream_idx, user_idx);
      }
    }
  }

  /**
   * 소케 연결 종료시
   * @param client
   * @returns
   */
  async handleDisconnect(client: AuthenticatedSocket) {
    const { broadcaster_id, stream_idx, type, user_idx, guest_uuid } =
      client.user;

    if (!this.chatRooms.has(broadcaster_id)) {
      console.error(`Room not found for broadcaster: ${broadcaster_id}`);
      return;
    }

    const roomMap = this.chatRooms.get(broadcaster_id);
    const userKey = type === 'guest' ? guest_uuid : user_idx.toString();

    if (roomMap.has(userKey)) {
      roomMap.delete(userKey);
      client.leave(broadcaster_id); // 클라이언트를 Socket.IO 룸에서 명시적으로 제거

      if (type === 'guest') {
        console.log(`Guest(${guest_uuid}) user disconnected from ${broadcaster_id}`);
        await this.streamViewerService.deleteStreamViewer(
          stream_idx,
          undefined,
          guest_uuid,
        );
      } else if (type === 'member' || type === 'owner') {
        console.log(`Member(${user_idx}) user disconnected from ${broadcaster_id}`);
        await this.streamViewerService.deleteStreamViewer(stream_idx, user_idx);
      }
    }
  }
}
