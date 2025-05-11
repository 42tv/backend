import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { EventsGateway } from 'src/chat/chat.gateway';

@Injectable()
export class RedisService {
  private publisher: Redis;
  private subscriber: Redis;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway, // Circular dependency 해결을 위해 forwardRef 사용
  ) {
    this.publisher = new Redis({
      host: process.env.REDIS_IP,
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    });
    this.subscriber = new Redis({
      host: process.env.REDIS_IP,
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    });
  }

  async onModuleInit() {
    await this.subscriber.subscribe('chatting', (err, count) => {
      if (err) {
        console.error('Failed to subscribe: %s', err.message);
        return;
      }
      console.log(
        `Subscribed successfully! This client is currently subscribed to ${count} channels.`,
      );
    });
    this.subscriber.on('message', (channel, message) => {
      if (channel == 'chatting') {
        const parsedMessage = JSON.parse(message);
        this.eventsGateway.sendMessageToRoom(
          parsedMessage.broadcaster_id,
          'chat',
          parsedMessage,
        );
      }
    });
  }

  async publicshMessage(channel: string, message: any) {
    await this.redis.publish(channel, JSON.stringify(message));
  }

  async sendChatToRoom(broadcastId: string, data: any) {
    await this.eventsGateway.sendMessageToRoom(broadcastId, 'chat', data);
  }
}
