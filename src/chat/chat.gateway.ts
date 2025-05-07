import { Inject, forwardRef } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';
import { WebSocketDto } from './dto/ws.entity';

interface JwtPayload {
  streamer_idx: number;
  streamer_id: string;
  streamer_nickname: string;
  type: string;
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
  ) {}

  @WebSocketServer()
  server: Server;
  wsClients = new Map<string, WebSocketDto>();

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

  // @UseGuards(WsGuard)
  // @SubscribeMessage('regist-user_id')
  // getAllDashBoardUser(
  //   @MessageBody() data: string,
  //   @ConnectedSocket() client: any,
  // ): string {
  //   this.wsClients.get(client.user.user_id);
  //   return data;
  // }

  async handleConnection(client: AuthenticatedSocket) {
    console.log(`Connected WS : ${client.id}`);
    console.log(client.user);
    // console.log(client.handshake.auth);
    // const token = client.handshake.auth.token.split(' ')[1];
    // const validated_token = this.authService.validate(token);
    // console.log(validated_token);
    // try {
    //   const jwt = client.handshake.auth.token.split(' ')[1];
    //   const user_id = this.authService.decode(jwt)['user_id'];
    //   const user = await this.userService.findByUserId(user_id);
    //   if (!user) throw new WsException('존재하지 않는 아이디입니다.');
    //   const bj = await this.bjService.findById(user.bj_id);
    //   if (!bj) throw new WsException('존재하지 않는 BJ/매니저 입니다.');
    //   const tmp = new WebSocketDto(client.id, client, bj.panda_id);
    //   this.wsClients.set(client.id, tmp);
    //   console.log(Array.from(this.wsClients.values()).length);
    // } catch (e) {
    //   console.log(`Disconnected WS : ${client.id}`);
    // }
  }

  async handleDisconnect(client: Socket) {
    console.log(`Disconnected WS : ${client.id}`);
    this.wsClients.delete(client.id);
    console.log(Array.from(this.wsClients.values()).length);
  }

  getClientClassByPandaId(panda_id: string) {
    // const clientData = Array.from(this.wsClients.values()).find(
    //   (client) => client.panda_id == panda_id,
    // );
    // if (clientData) {
    //   return clientData;
    // }
    // return null;
  }

  async sendRoomJoin(panda_id: string, nicknames: any[]) {
    // // console.log(nicknames);
    // const client: WebSocketDto = this.getClientClassByPandaId(panda_id);
    // if (!client) return;
    // const data = await this.roomService.getHartData(panda_id, nicknames);
    // // console.log(data.length);
    // console.log(client.socket.client.conn.remoteAddress);
    // client.socket.emit('room-join', data);
  }

  async sendRoomLeave(panda_id: string, nicknames: string[]) {
    // const client: WebSocketDto = this.getClientClassByPandaId(panda_id);
    // if (!client) return;
    // console.log(`socket `, nicknames);
    // client.socket.emit('room-leave', nicknames);
  }

  broadCastHartEvent(data: any) {
    this.wsClients.forEach((client) => {
      client.socket.emit('hart-event', data);
    });
  }
}
