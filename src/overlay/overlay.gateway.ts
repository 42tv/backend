import { Inject, forwardRef } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from 'src/redis/redis.service';
import { WidgetService } from 'src/widget/widget.service';

interface OverlaySocket extends Socket {
  broadcasterId: string;
  widgetId: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'overlay',
})
export class OverlayGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    @Inject(forwardRef(() => RedisService))
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => WidgetService))
    private readonly widgetService: WidgetService,
  ) {}

  @WebSocketServer()
  server: Server;

  private overlaySockets = new Map<string, Map<string, OverlaySocket>>();

  afterInit(server: Server) {
    server.use(async (socket: Socket, next) => {
      const token = socket.handshake.query.token as string;
      if (!token) return next(new Error('위젯 토큰이 필요합니다.'));

      try {
        const config = await this.widgetService.getConfig(token);
        if (!config) return next(new Error('유효하지 않은 위젯 토큰입니다.'));

        (socket as OverlaySocket).broadcasterId = config.broadcasterId;
        (socket as OverlaySocket).widgetId =
          (socket.handshake.query.widgetId as string) || socket.id;
        next();
      } catch {
        next(new Error('유효하지 않은 위젯 토큰입니다.'));
      }
    });
  }

  async handleConnection(client: OverlaySocket) {
    const { broadcasterId, widgetId } = client;

    if (!this.overlaySockets.has(broadcasterId)) {
      this.overlaySockets.set(broadcasterId, new Map<string, OverlaySocket>());
    }
    this.overlaySockets.get(broadcasterId).set(widgetId, client);
    await this.redisService.acquireRoomSubscription(broadcasterId, 'overlay');

    console.log(
      `[Overlay Connect] broadcasterId: ${broadcasterId}, widgetId: ${widgetId}`,
    );
  }

  async handleDisconnect(client: OverlaySocket) {
    const { broadcasterId, widgetId } = client;

    if (this.overlaySockets.has(broadcasterId)) {
      const roomMap = this.overlaySockets.get(broadcasterId);
      if (roomMap.has(widgetId)) {
        roomMap.delete(widgetId);
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
      `[Overlay Disconnect] broadcasterId: ${broadcasterId}, widgetId: ${widgetId}`,
    );
  }

  sendToOverlay<T = unknown>(
    broadcasterId: string,
    eventName: string,
    data: T,
  ) {
    if (!this.overlaySockets.has(broadcasterId)) return;
    const roomMap = this.overlaySockets.get(broadcasterId);
    roomMap.forEach((client) => {
      client.emit(eventName, data);
    });
  }
}
