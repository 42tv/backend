import { Inject, forwardRef } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { RedisService } from 'src/redis/redis.service';
import { StreamService } from 'src/stream/stream.service';
import { WebsocketJwt } from 'src/play/interfaces/websocket';
import { ServerCommandMessage } from 'src/redis/interfaces/redis-message.interface';
import { RedisMessages } from 'src/redis/interfaces/message-namespace';

interface AuthenticatedSocket extends Socket {
  user: WebsocketJwt;
}

type UserType = 'manager' | 'broadcaster' | 'member' | 'guest' | 'viewer';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'chat',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly authService: AuthService,
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
        const authHeader =
          socket.handshake.auth.token ||
          socket.handshake.headers['authorization']; // "Bearer <token>"
        if (!authHeader) {
          return next(new Error('인증 헤더가 없습니다.'));
        }
        const token = authHeader.split(' ')[1];
        console.log(token);
        if (!token) {
          return next(new Error('토큰이 없습니다.'));
        }
        const payload: WebsocketJwt = await this.authService.validate(token);
        // TypeScript 용으로 socket에 프로퍼티 추가
        (socket as any).user = payload;
        next();
      } catch (err) {
        // authService.validate에서 발생한 오류 또는 기타 오류 처리
        if (
          err instanceof Error &&
          err.message === '이미 시청중인 방송입니다'
        ) {
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
    // 해당 room이 이 서버에 존재하는지 확인
    console.log(this.chatRooms.has(broadcasterId));
    if (this.chatRooms.has(broadcasterId)) {
      // Socket.IO의 room 기능을 사용하여 해당 room의 모든 클라이언트에게 전송
      this.server.to(broadcasterId).emit(eventName, data);
      console.log(
        `[SendToRoom] - room: ${broadcasterId}, event: ${eventName}, data:`,
        data,
      );
    }
  }

  /**
   * chatRoom에서 지정된 type들에게만 메시지 보내기
   * @param broadcasterId 스트리머 idx
   * @param eventName 메시지 이벤트 이름
   * @param data 메시지 데이터
   * @param targetTypes 메시지를 받을 사용자 타입들 ('manager', 'broadcaster', 'viewer' 중에서만 선택 가능)
   */
  async sendToSpecificUserTypes(
    broadcasterId: string, 
    eventName: string, 
    data: any, 
    targetTypes: UserType[]
  ) {
    // 해당 room이 이 서버에 존재하는지 확인
    if (this.chatRooms.has(broadcasterId)) {
      const roomMap = this.chatRooms.get(broadcasterId);
      let sentCount = 0;
      
      // room의 모든 사용자를 순회하면서 지정된 type들에게만 메시지 전송
      roomMap.forEach((client: AuthenticatedSocket, userId: string) => {
        if (targetTypes.includes(client.user.user.role as UserType)) {
          client.emit(eventName, data);
          sentCount++;
          console.log(
            `[SendToSpecificUserTypes] - room: ${broadcasterId}, user: ${userId}, role: ${client.user.user.role}, event: ${eventName}`,
          );
        }
      });
      
      console.log(
        `[SendToSpecificUserTypes] - room: ${broadcasterId}, event: ${eventName}, targetTypes: [${targetTypes.join(', ')}], sentCount: ${sentCount}, data:`,
        data,
      );
    }
  }

  /**
   * 소켓 연결시
   * @param client
   * @returns
   */
  async handleConnection(client: AuthenticatedSocket) {
    // 구조분해 할당
    const { broadcaster, user, stream } = client.user;
    
    console.log(broadcaster.user_id, stream.idx, user.role, user.idx, user.guest_id, user.nickname);

    const registerId = user.user_id || user.guest_id;

    // 자기 서버에 이미 접속중이라면 클라이언트에 중복 접속금지 알림
    if (this.chatRooms.has(broadcaster.user_id)) {
      const roomMap = this.chatRooms.get(broadcaster.user_id);
      if (roomMap.has(registerId)) {
        const existingClient = roomMap.get(registerId);
        if (existingClient) {
          console.log(
            `Duplicate user(${existingClient.id}) leaved ${broadcaster.user_id}`,
          );
          existingClient.emit('duplicate_connection', {
            message: '다른 클라이언트에서 접속하였습니다',
          });
          existingClient.leave(broadcaster.user_id); // 기존 소켓을 룸에서 제거
          roomMap.delete(registerId); // 기존 소켓 제거
        }
      }
    }

    // 만약 방송자 or 매니저가 웹소켓 연결시 시청자 목록을 보내주어야함.
    if (user.role === 'broadcaster' || user.role === 'manager') {
      const viewers = await this.redisService.getViewersList(broadcaster.user_id);
      client.emit('viewer_list', viewers);
    }

    // chatRoom에 사용자 추가
    await this.addChatRoomUser(broadcaster.user_id, registerId, client);
    // redis에 connection을 자신으로 덮어씌우고, 만약 다른서버에 존재한다면 해당 서버에 없애라고 pub날림
    await this.redisService.registConnection(broadcaster.user_id, registerId);
    await this.redisService.registViewer(broadcaster.user_id, registerId, user.idx, user.nickname, user.role);
    
    // Redis를 통해 모든 서버의 해당 room에 사용자 입장 알림
    await this.redisService.publishMessage(
      `room:${broadcaster.user_id}`, 
      RedisMessages.userJoinLeave('join', broadcaster.user_id, registerId, user.idx, user.nickname, user.role)
    );
    // 재생 수 증가 - 각 접속마다 증가
    if (broadcaster.idx) {
      try {
        await this.streamService.increasePlayCountByStreamId(stream.stream_id);
        const viewerCount = await this.redisService.getHashFieldCount(
          `viewer:${broadcaster.user_id}`,
        );
        // Redis를 통해 모든 서버의 해당 room에 재생 수 증가 알림
        await this.redisService.publishMessage(
          `room:${broadcaster.user_id}`, 
          RedisMessages.viewerCount(broadcaster.user_id, viewerCount)
        );
      } catch (error) {
        console.error(`Failed to increase play count: ${error.message}`);
      }
    }
  }

  /**
   * 소케 연결 종료시
   * @param client
   * @returns
   */
  async handleDisconnect(client: AuthenticatedSocket) {
    // 구조분해 할당
    const { broadcaster, user } = client.user;
    
    const registerId = user.user_id || user.guest_id;

    // 자신의 서버에 연결된 유저가 나갔을때만 redis에서 key삭제
    if (this.chatRooms.has(broadcaster.user_id)) {
      if (this.chatRooms.get(broadcaster.user_id).has(registerId)) {
        // Redis에서 연결 정보 삭제
        console.log(
          `redis에서 연결 정보 삭제: con:${broadcaster.user_id}:${registerId}`,
        );
        await this.redisService.removeConnection(broadcaster.user_id, registerId);
        await this.redisService.removeViewer(broadcaster.user_id, registerId);
      }
    }

    // 사용자가 나갔다는 알림을 Redis를 통해 모든 서버의 해당 room에 전송
    await this.redisService.publishMessage(
      `room:${broadcaster.user_id}`, 
      RedisMessages.userJoinLeave('leave', broadcaster.user_id, registerId, user.idx, user.nickname, user.role)
    );

    const viewerCount = await this.redisService.getHashFieldCount(
      `viewer:${broadcaster.user_id}`,
    );
    // Redis를 통해 모든 서버의 해당 room에 재생 수 증가 알림
    await this.redisService.publishMessage(
      `room:${broadcaster.user_id}`, 
      RedisMessages.viewerCount(broadcaster.user_id, viewerCount)
    );
    await this.deleteChatRoomUser(broadcaster.user_id, registerId);
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
    client: AuthenticatedSocket,
  ) {
    if (!this.chatRooms.has(broadcasterId)) {
      console.log(`[Create] - chatRoom[${broadcasterId}]: ${broadcasterId}`);
      this.chatRooms.set(broadcasterId, new Map<string, AuthenticatedSocket>());
      await this.redisService.subscribe(`room:${broadcasterId}`);
    }
    this.chatRooms.get(broadcasterId).set(userId, client);
    client.join(broadcasterId);
  }

  /**
   * chatRoom에서 사용자 제거 후 사이즈가 0이라면 chatRoom에서 제거 후 unsubscribe
   * @param broadcasterId
   * @param userId
   */
  async deleteChatRoomUser(broadcasterId: string, userId: string) {
    // 자신의 서버에 채팅방이 존재하는지 확인
    if (this.chatRooms.has(broadcasterId)) {
      const roomMap = this.chatRooms.get(broadcasterId);

      // 해당 user_id가 채팅방에 존재하는지 확인
      if (roomMap.has(userId)) {
        // 채팅방 떠남
        console.log(
          `[Leave User] - room: ${broadcasterId}, user: ${userId}, prev_server_id: ${this.redisService.getServerId()}`,
        );
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
  async handleServerCommmand(message: ServerCommandMessage) {
    console.log(message.command == 'delete');
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
