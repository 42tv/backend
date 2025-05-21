import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { EventsGateway } from 'src/chat/chat.gateway';

@Injectable()
export class RedisService {
  private serverId: number;
  
  private publisher: Redis;
  private subscriber: Redis;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway, // Circular dependency 해결을 위해 forwardRef 사용
  ) {
    this.subscriber = new Redis({
      host: process.env.REDIS_IP,
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD,
    });
  }

  async onModuleInit() {
    // 서버 ID 발급받기
    this.serverId = await this.incr('server_id_counter') - 1;
    console.log(`Server ID: ${this.serverId}`);
    
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

  async publishMessage(channel: string, message: any) {
    await this.redis.publish(channel, JSON.stringify(message));
  }

  async sendChatToRoom(broadcastId: string, data: any) {
    await this.eventsGateway.sendMessageToRoom(broadcastId, 'chat', data);
  }

  async registSocketId(
    socketId: string,
    userId: string,
  ) {

  }

  /**
   * Redis에 키-값 쌍을 저장합니다.
   * @param key 저장할 키
   * @param value 저장할 값
   * @param ttl 만료 시간(초), 옵션
   * @returns 작업 성공 여부 (OK)
   */
  private async set(key: string, value: string, ttl?: number): Promise<string> {
    if (ttl) {
      return await this.redis.set(key, value, 'EX', ttl);
    }
    return await this.redis.set(key, value);
  }

  /**
   * Redis에서 키에 해당하는 값을 가져옵니다.
   * @param key 조회할 키
   * @returns 저장된 값 또는 null (키가 존재하지 않는 경우)
   */
  private async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  /**
   * Redis에서 키의 존재 여부를 확인합니다.
   * @param key 확인할 키
   * @returns 키가 존재하면 1, 아니면 0
   */
  private async exists(key: string): Promise<number> {
    return await this.redis.exists(key);
  }

  /**
   * Redis에서 키를 삭제합니다.
   * @param key 삭제할 키 또는 키 배열
   * @returns 삭제된 키의 개수
   */
  private async del(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) {
      return await this.redis.del(...key);
    }
    return await this.redis.del(key);
  }

  /**
   * Redis에 해시 데이터를 저장합니다.
   * @param key 해시 키
   * @param field 필드 이름
   * @param value 필드 값
   * @returns 새 필드가 생성되면 1, 기존 필드가 업데이트되면 0
   */
  private async hset(key: string, field: string, value: string): Promise<number> {
    return await this.redis.hset(key, field, value);
  }

  /**
   * Redis에서 해시 필드 값을 가져옵니다.
   * @param key 해시 키
   * @param field 필드 이름
   * @returns 필드 값 또는 null (키나 필드가 존재하지 않는 경우)
   */
  private async hget(key: string, field: string): Promise<string | null> {
    return await this.redis.hget(key, field);
  }

  /**
   * Redis에 저장된 키의 남은 만료 시간을 초 단위로 반환합니다.
   * @param key 확인할 키
   * @returns 남은 시간(초), 키가 없거나 만료 설정이 없으면 -1 또는 -2
   */
  private async ttl(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }

  /**
   * Redis에 저장된 키의 만료 시간을 설정합니다.
   * @param key 키
   * @param seconds 만료 시간(초)
   * @returns 성공 시 1, 키가 없으면 0
   */
  private async expire(key: string, seconds: number): Promise<number> {
    return await this.redis.expire(key, seconds);
  }

  /**
   * Redis의 INCR 명령어를 사용하여 지정된 키의 값을 1 증가시킵니다.
   * @param key 증가시킬 키
   * @returns 증가 후의 값
   */
  private async incr(key: string): Promise<number> {
    return await this.redis.incr(key);
  }

  /**
   * 서버 ID를 반환합니다.
   * 이 ID는 서버 시작 시 Redis의 INCR 명령어를 통해 발급받은 고유 ID입니다.
   * @returns 서버 ID
   */
  private getServerId(): number {
    return this.serverId;
  }
}
