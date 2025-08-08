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
import { RedisMessages } from 'src/redis/interfaces/message-namespace';
import { OpCode } from 'src/redis/interfaces/room.message';

interface AuthenticatedSocket extends Socket {
  jwt: WebsocketJwt;
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
   * - client.user 에 jwt valdiate해서 넣어줌
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
        (socket as any).jwt = payload;
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
   * - room에 메세지 보내기
   * @param broadcasterId - 스트리머 idx
   * @param eventName - 메세지 이벤트 이름
   * @param data - 메세지 데이터
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
   * - chatRoom에서 지정된 type들에게만 메시지 보내기
   * @param broadcasterId - 스트리머 idx
   * @param eventName - 메시지 이벤트 이름
   * @param data - 메시지 데이터
   * @param targetTypes - 메시지를 받을 사용자 타입들 ('manager', 'broadcaster', 'viewer' 중에서만 선택 가능)
   */
  async sendToSpecificUserTypes(
    broadcasterId: string,
    eventName: string,
    data: any,
    targetTypes: UserType[],
  ) {
    // 해당 room이 이 서버에 존재하는지 확인
    if (this.chatRooms.has(broadcasterId)) {
      const roomMap = this.chatRooms.get(broadcasterId);
      let sentCount = 0;

      // room의 모든 사용자를 순회하면서 지정된 type들에게만 메시지 전송
      roomMap.forEach((client: AuthenticatedSocket, userId: string) => {
        if (targetTypes.includes(client.jwt.user.role as UserType)) {
          client.emit(eventName, data);
          sentCount++;
          console.log(
            `[SendToSpecificUserTypes] - room: ${broadcasterId}, user: ${userId}, role: ${client.jwt.user.role}, event: ${eventName}`,
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
   * - 소켓 연결시
   * @param client
   * @returns
   */
  async handleConnection(client: AuthenticatedSocket) {
    // 구조분해 할당
    const { broadcaster, user, stream } = client.jwt;

    console.log(
      broadcaster.user_id,
      stream.idx,
      user.role,
      user.idx,
      user.guest_id,
      user.nickname,
    );

    const registerId = user.user_id || user.guest_id;

    // 방송자 or 매니저가 웹소켓 연결시 시청자 목록을 보내주어야함.
    if (user.role === 'broadcaster' || user.role === 'manager') {
      const viewers = await this.redisService.getViewersList(
        broadcaster.user_id,
      );
      client.emit(OpCode.VIEWER_LIST, { viewers });
    }

    // chatRoom에 사용자 추가
    await this.addChatRoomUser(broadcaster.user_id, registerId, client);

    // Redis를 통해 모든 서버의 해당 room에 사용자 입장 알림
    await this.redisService.publishRoomMessage(
      `room:${broadcaster.user_id}`,
      RedisMessages.userJoin(
        broadcaster.user_id,
        registerId,
        user.idx,
        user.nickname,
        {
          idx: user.idx,
          user_id: user.user_id,
          nickname: user.nickname,
          role: user.role,
          profile_img: user.profile_img,
          is_guest: user.is_guest,
          guest_id: user.guest_id,
        },
      ),
    );

    // 재생 수 증가 - 각 접속마다 증가
    if (broadcaster.idx) {
      try {
        await this.streamService.increasePlayCountByStreamId(stream.stream_id);
        const viewerCount = await this.redisService.getHashFieldCount(
          `viewer:${broadcaster.user_id}`,
        );
        // Redis를 통해 모든 서버의 해당 room에 재생 수 증가 알림
        await this.redisService.publishRoomMessage(
          `room:${broadcaster.user_id}`,
          RedisMessages.viewerCount(broadcaster.user_id, viewerCount),
        );
      } catch (error) {
        console.error(`Failed to increase play count: ${error.message}`);
      }
    }
  }

  /**
   * - 소케 연결 종료시
   * @param client
   * @returns
   */
  async handleDisconnect(client: AuthenticatedSocket) {
    // 구조분해 할당
    const { broadcaster, user } = client.jwt;

    const registerId = user.user_id || user.guest_id;

    // 서버에 방이 존재하고
    if (this.chatRooms.has(broadcaster.user_id)) {
      const roomMap = this.chatRooms.get(broadcaster.user_id);
      // 해당 userId가 방에 존재한다면
      // duplicate disconnect의 경우 이미 존재하지 않을것임
      if (roomMap.has(registerId)) {
        // 방송자의 채팅방에서 사용자 제거 및 redis에서 제거
        await this.deleteChatRoomUser(broadcaster.user_id, registerId);
        // 사용자가 나갔다는 알림을 Redis를 통해 모든 서버의 해당 room에 전송
        await this.redisService.publishRoomMessage(
          `room:${broadcaster.user_id}`,
          RedisMessages.userLeave(
            broadcaster.user_id,
            registerId,
            user.idx,
            user.nickname,
            {
              idx: user.idx,
              user_id: user.user_id,
              nickname: user.nickname,
              role: user.role,
              profile_img: user.profile_img,
              is_guest: user.is_guest,
              guest_id: user.guest_id,
            },
          ),
        );
        const viewerCount = await this.redisService.getHashFieldCount(
          `viewer:${broadcaster.user_id}`,
        );
        // Redis를 통해 모든 서버의 해당 room에 재생 수 증가 알림
        await this.redisService.publishRoomMessage(
          `room:${broadcaster.user_id}`,
          RedisMessages.viewerCount(broadcaster.user_id, viewerCount),
        );
      }
    }
  }

  /**
   * - 중복 접속으로 인한 연결 해제 처리
   * @param broadcasterId - 방송자 ID
   * @param userId - 사용자 ID
   */
  async handleDuplicateDisconnect(broadcasterId: string, userId: string) {
    console.log(
      `[Duplicate Disconnect] - room: ${broadcasterId}, user: ${userId}`,
    );
    // 서버에 방이 존재하고
    if (this.chatRooms.has(broadcasterId)) {
      const roomMap = this.chatRooms.get(broadcasterId);
      // 해당 userId가 방에 존재한다면
      if (roomMap.has(userId)) {
        const existingClient = roomMap.get(userId);
        // roomMap에서 제거
        roomMap.delete(userId);
        // emit 후 disconnect
        if (existingClient) {
          console.log(`Disconnecting duplicate user: ${existingClient.id}`);
          existingClient.emit('duplicate_connection', {
            message: '다른 클라이언트에서 접속하였습니다',
          });
          existingClient.leave(broadcasterId);
          existingClient.disconnect(true);
        }
      }
    }
  }

  /**
   * - 기존 접속된 서버에 중복 접속 해제 명령 전송
   * @param existingServerId - 기존 서버 ID
   * @param broadcasterId - 방송자 ID
   * @param registerId - 등록 ID
   */
  private async publishDuplicateConnect(
    existingServerId: string,
    broadcasterId: string,
    registerId: string,
  ) {
    const duplicateConnect = RedisMessages.duplicateConnect(
      parseInt(existingServerId),
      broadcasterId,
      registerId,
    );

    await this.redisService.publishRoomMessage(
      `server_command:${existingServerId}`,
      duplicateConnect,
    );
  }

  /**
   * - chatRoom에 사용자 추가
   * - 만약 chatRoom에 없다면 새로 생성하고 redis에 subscribe
   * - chatRoom[broadcasterId][userId]와  redis에 con, viewer 추가한 후 websocket room join
   * @param broadcasterId
   * @param userId
   * @param client
   */
  async addChatRoomUser(
    broadcasterId: string,
    userId: string,
    client: AuthenticatedSocket,
  ) {
    // 자기가 관리하는 채팅방에 broadcasterId가 없다면 새로 생성 및 이벤트 구독 추가
    if (!this.chatRooms.has(broadcasterId)) {
      console.log(`[Create] - chatRoom[${broadcasterId}]: ${broadcasterId}`);
      this.chatRooms.set(broadcasterId, new Map<string, AuthenticatedSocket>());
      await this.redisService.subscribe(`room:${broadcasterId}`);
    }
    // chatRoom Map에 추가
    this.chatRooms.get(broadcasterId).set(userId, client);
    // Redis에 con, viewer 추가
    await this.redisService.registConnection(broadcasterId, userId);
    await this.redisService.registViewer(broadcasterId, userId, client.jwt);
    client.join(broadcasterId);
  }

  /**
   * - 채팅방에서 사용자 제거
   * - 자신의 서버에 채팅방이 존재하는지 확인 후 해당 user_id가 채팅방에 존재하는지 확인
   * - 존재한다면 채팅방에서 나가고 Redis에서 연결 정보 삭제
   * - 만약 자기 서버의 broadcaster 채팅방에 아무도 없다면 채팅방을 제거하고 Redis 구독 해제
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
        // websocket room에서 나감
        roomMap.get(userId).leave(broadcasterId);
        // 채팅방에서 사용자 제거
        roomMap.delete(userId);
        console.log(
          `redis에서 연결 정보 삭제: con:${broadcasterId}, hash key: ${userId}`,
        );
        // Redis에서 연결 정보 삭제
        await this.redisService.removeConnection(broadcasterId, userId);
        await this.redisService.removeViewer(broadcasterId, userId);
        // 만약 자기 서버의 broadcaster 채팅방에 아무도 없다면 채팅방을 제거하고 Redis 구독 해제
        if (roomMap.size === 0) {
          console.log(`[Delete] - chatRoom[${broadcasterId}]:${userId}`);
          this.chatRooms.delete(broadcasterId);
          await this.redisService.unsubscribe(`room:${broadcasterId}`);
        }
      }
    }
  }

  /**
   * - chatRooms에 저장된 AuthenticatedSocket의 user.user 속성만 교체하는 함수
   * @param broadcasterId
   * @param userId
   * @param newUserInfo - WebsocketJwt['user'] 타입의 새로운 값
   */
  async replaceChatRoomUserInfo(
    broadcasterId: string,
    userId: string,
    newUserInfo: WebsocketJwt['user'],
  ) {
    const roomMap = this.chatRooms.get(broadcasterId);
    if (roomMap && roomMap.has(userId)) {
      roomMap.get(userId).jwt.user = newUserInfo;
    }
  }
}
