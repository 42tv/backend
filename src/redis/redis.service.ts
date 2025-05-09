import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { EventsGateway } from 'src/chat/chat.gateway';

@Injectable()
export class RedisService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway, // Circular dependency 해결을 위해 forwardRef 사용
  ) {}

  async publicshMessage(channel: string, message: any) {
    await this.redis.publish(channel, JSON.stringify(message));
  }

  async sendChatToRoom(broadcastId: string, data: any) {
    await this.eventsGateway.sendMessageToRoom(broadcastId, 'chat', data);
  }
}
