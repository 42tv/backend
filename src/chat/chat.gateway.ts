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
        const token = authHeader.split(' ')[1];
        const payload: JwtPayload = await this.authService.validate(token);
        // TypeScript 용으로 socket에 프로퍼티 추가
        (socket as any).user = payload;
        next();
      } catch (err) {
        next(new Error('인증 실패'));
      }
    });
  }

  /**
   * room에 메세지 보내기
   * @param broadcaster_idx 스트리머 idx
   * @param eventName 메세지 이벤트 이름
   * @param data 메세지 데이터
   */
  async sendMessageToRoom(
    broadcaster_idx: number,
    eventName: string,
    data: any,
  ) {
    this.server.to(broadcaster_idx.toString()).emit(eventName, data);
  }

  /**
   * 소켓 연결시
   * @param client
   * @returns
   */
  async handleConnection(client: AuthenticatedSocket) {
    // jwt없이 연결하면 뭐 위에서 걸러지겟지만 한번 더 검사
    if (!client.user) {
      console.log('No user found in socket connection');
      client.disconnect();
      return;
    }

    // 구조분해 할당
    const { broadcaster_id, stream_idx, type, user_idx, guest_uuid } =
      client.user;

    // broadcaster_id의 방을 가져옴
    const existingRoom = this.chatRooms.get(broadcaster_id);
    if (existingRoom) {
      if (type == 'guest') {
        const existingGuest = existingRoom.get(guest_uuid);
        if (existingGuest) {
          console.log(
            `Guest(${guest_uuid}) is already in room ${broadcaster_id}`,
          );
          return;
        }
      } else if (type == 'member') {
        const existingMember = existingRoom.get(user_idx.toString());
        if (existingMember) {
          console.log(`User ${user_idx} is already in room ${broadcaster_id}`);
          return;
        }
      }
    }

    // Join the room based on stream_idx
    client.join(broadcaster_id);
    // Add user to chatRooms map
    if (!this.chatRooms.has(broadcaster_id)) {
      this.chatRooms.set(
        broadcaster_id,
        new Map<string, AuthenticatedSocket>(),
      );
    }

    if (type == 'guest') {
      console.log(`Guest(${guest_uuid}) user connected ${broadcaster_id}`);
      this.chatRooms.get(broadcaster_id).set(guest_uuid, client);
      await this.streamViewerService.addStreamViewer(
        stream_idx,
        undefined,
        guest_uuid,
      );
    } else if (type == 'member') {
      console.log(`Member(${user_idx}) user connected ${broadcaster_id}`);
      this.chatRooms.get(broadcaster_id).set(user_idx.toString(), client);
      await this.streamViewerService.addStreamViewer(stream_idx, user_idx);
    }
  }

  /**
   * 소케 연결 종료시
   * @param client
   * @returns
   */
  async handleDisconnect(client: AuthenticatedSocket) {
    if (!client.user) {
      console.log('No user found in socket disconnection');
      return;
    }

    const { broadcaster_id, type, stream_idx, user_idx, guest_uuid } =
      client.user;

    // Leave the room
    client.leave(stream_idx.toString());

    // Remove user from chatRooms map
    if (this.chatRooms.has(broadcaster_id)) {
      if (type === 'guest') {
        console.log(`Guest(${guest_uuid}) user disconnected ${broadcaster_id}`);
        this.chatRooms.get(broadcaster_id).delete(guest_uuid);
        if (this.chatRooms.get(broadcaster_id).size === 0) {
          console.log(
            `Room ${broadcaster_id} is empty, removing from chatRooms`,
          );
          this.chatRooms.delete(broadcaster_id);
        } else {
          console.log(
            `room ${broadcaster_id} size ${this.chatRooms.get(broadcaster_id).size}`,
          );
        }
        await this.streamViewerService.deleteStreamViewer(
          stream_idx,
          undefined,
          guest_uuid,
        );
      } else if (type === 'member') {
        console.log(`Member(${user_idx}) user disconnected ${broadcaster_id}`);
        this.chatRooms.get(broadcaster_id).delete(user_idx.toString());
        if (this.chatRooms.get(broadcaster_id).size === 0) {
          console.log(
            `Room ${broadcaster_id} is empty, removing from chatRooms`,
          );
          this.chatRooms.delete(broadcaster_id);
        } else {
          console.log(
            `room ${broadcaster_id} size ${this.chatRooms.get(broadcaster_id).size}`,
          );
        }
        await this.streamViewerService.deleteStreamViewer(stream_idx, user_idx);
      }
    }
  }
}
