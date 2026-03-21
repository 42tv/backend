import { Inject, forwardRef } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from 'src/redis/redis.service';
import { JwtPayload } from 'src/auth/interfaces/auth.interface';

interface OverlaySocket extends Socket {
  broadcasterId: string;
  chatBoxId: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'overlay',
})
export class OverlayGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => RedisService))
    private readonly redisService: RedisService,
  ) {}

  @WebSocketServer()
  server: Server;

  private overlaySockets = new Map<string, Map<string, OverlaySocket>>();

  afterInit(server: Server) {
    server.use(async (socket: Socket, next) => {
      try {
        const authHeader =
          socket.handshake.auth.token ||
          socket.handshake.headers['authorization'];
        if (!authHeader) return next(new Error('인증 헤더가 없습니다.'));

        const token = authHeader.split(' ')[1];
        if (!token) return next(new Error('토큰이 없습니다.'));

        const payload: JwtPayload = this.jwtService.verify(token, {
          secret: process.env.JWT_ACCESS_SECRET,
        });

        if (payload.is_guest || !payload.user_id) {
          return next(new Error('방송자 계정이 필요합니다.'));
        }

        const chatBoxId =
          (socket.handshake.query.chatBoxId as string) || socket.id;

        (socket as OverlaySocket).broadcasterId = payload.user_id;
        (socket as OverlaySocket).chatBoxId = chatBoxId;
        next();
      } catch {
        next(new Error('인증 실패'));
      }
    });
  }

  async handleConnection(client: OverlaySocket) {
    const { broadcasterId, chatBoxId } = client;

    if (!this.overlaySockets.has(broadcasterId)) {
      this.overlaySockets.set(broadcasterId, new Map<string, OverlaySocket>());
    }
    this.overlaySockets.get(broadcasterId).set(chatBoxId, client);
    await this.redisService.acquireRoomSubscription(broadcasterId, 'overlay');

    console.log(
      `[Overlay Connect] broadcasterId: ${broadcasterId}, chatBoxId: ${chatBoxId}`,
    );
  }

  async handleDisconnect(client: OverlaySocket) {
    const { broadcasterId, chatBoxId } = client;

    if (this.overlaySockets.has(broadcasterId)) {
      const roomMap = this.overlaySockets.get(broadcasterId);
      if (roomMap.has(chatBoxId)) {
        roomMap.delete(chatBoxId);
        await this.redisService.releaseRoomSubscription(
          broadcasterId,
          'overlay',
        );
        if (roomMap.size === 0) {
          this.overlaySockets.delete(broadcasterId);
        }
      }
    }

    console.log(
      `[Overlay Disconnect] broadcasterId: ${broadcasterId}, chatBoxId: ${chatBoxId}`,
    );
  }

  sendToOverlay<T = unknown>(broadcasterId: string, data: T) {
    if (!this.overlaySockets.has(broadcasterId)) return;
    const roomMap = this.overlaySockets.get(broadcasterId);
    roomMap.forEach((client) => {
      client.emit('overlay_event', data);
    });
  }
}
