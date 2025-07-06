import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { EventsGateway } from 'src/chat/chat.gateway';
import { BookmarkEvent } from 'src/bookmark/entities/bookmark.entity';
import {
  RoomChatEvent,
  RoomRecommendEvent,
  RoomUpdateEvent,
  ServerCommand,
} from 'src/utils/utils';

@Injectable()
export class RedisService {
  private serverId: number;
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
    this.serverId = (await this.incr('server_id_counter')) - 1;
    console.log(`Server ID: ${this.serverId}`);

    // 서버 커맨드 채널 구독
    await this.subscribe(`server_command:${this.serverId}`);

    // 메시지 핸들러 등록
    this.subscriber.on('message', this.handleMessage.bind(this));
  }

  /**
   * Redis 메시지 핸들러
   * @param channel 메시지를 받은 채널
   * @param message 받은 메시지 (JSON 문자열)
   */
  private async handleMessage(channel: string, message: string) {
    try {
      const parsedMessage = JSON.parse(message);

      if (channel === `server_command:${this.serverId}`) {
        await this.handleServerCommand(parsedMessage);
      } else if (channel.startsWith('room:')) {
        await this.handleRoomMessage(parsedMessage);
      }
    } catch (error) {
      console.error(`[Redis] Failed to handle message:`, error);
    }
  }

  /**
   * 서버 커맨드 메시지 처리
   * @param message 서버 커맨드 메시지
   */
  private async handleServerCommand(message: any) {
    const command = message as ServerCommand;
    console.log(`[Server Command] received:`, command);
    await this.eventsGateway.handleServerCommmand(command);
  }

  /**
   * 룸 메시지 처리 (chat, recommend, viewer_count 등)
   * @param message 룸 메시지
   */
  private async handleRoomMessage(message: any) {
    const messageType = message.type;

    switch (messageType) {
      case 'viewer_count':
        await this.handleViewerCountMessage(message as RoomUpdateEvent);
        break;
      case 'chat':
        await this.handleChatMessage(message as RoomChatEvent);
        break;
      case 'recommend':
        await this.handleRecommendMessage(message as RoomRecommendEvent);
        break;
      case 'bookmark':
        await this.handleBookmarkMessage(message as BookmarkEvent)
        break;
      default:
        console.warn(`[Redis] Unknown room message type: ${messageType}`);
    }
  }

  /**
   * 시청자 수 업데이트 메시지 처리
   * @param message 시청자 수 업데이트 메시지
   */
  private async handleViewerCountMessage(message: RoomUpdateEvent) {
    const enrichedMessage = {
      ...message,
      viewer_cnt: message.viewer_cnt,
    };
    await this.eventsGateway.sendToRoom(
      message.broadcaster_id,
      message.type,
      enrichedMessage,
    );
  }

  /**
   * 채팅 메시지 처리
   * @param message 채팅 메시지
   */
  private async handleChatMessage(message: RoomChatEvent) {
    await this.eventsGateway.sendToRoom(
      message.broadcaster_id,
      message.type,
      message,
    );
  }

  /**
   * 추천 메시지 처리
   * @param message 추천 메시지
   */
  private async handleRecommendMessage(message: RoomRecommendEvent) {
    console.log(`[Recommend] received:`, message);
    await this.eventsGateway.sendToRoom(
      message.broadcaster_id,
      message.type,
      message,
    );
  }

  /**
   * 북마크 메시지 처리
   * @param message 북마크 메시지
   */
  private async handleBookmarkMessage(message: BookmarkEvent) {
    console.log(`[Bookmark] received:`, message);
    await this.eventsGateway.sendToRoom(
      message.broadcaster_id,
      message.type,
      message
    );
  }

  /**
   * Redis 채널 구독
   * @param channel 구독할 채널 이름
   */
  async subscribe(channel: string): Promise<void> {
    try {
      await this.subscriber.subscribe(channel);
      console.log(`Subscribed successfully to ${channel}`);
    } catch (error) {
      console.error(`Failed to subscribe to ${channel}:`, error.message);
      throw error;
    }
  }

  /**
   * Redis 채널 구독 해제
   * @param channel 구독 해제할 채널 이름
   */
  async unsubscribe(channel: string): Promise<void> {
    try {
      await this.subscriber.unsubscribe(channel);
      console.log(`Unsubscribed successfully from ${channel}`);
    } catch (error) {
      console.error(`Failed to unsubscribe from ${channel}:`, error.message);
      throw error;
    }
  }

  /**
   * Redis 채널에 메시지 발행
   * @param channel 발행할 채널
   * @param message 발행할 메시지
   */
  async publishMessage(channel: string, message: any): Promise<void> {
    try {
      await this.redis.publish(channel, JSON.stringify(message));
    } catch (error) {
      console.error(`Failed to publish message to ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Redis에 connection 등록, 다른 서버에 등록되어있었으면 publish 날려서 해당 서버에 삭제 요청
   * @param roomId 방 ID
   * @param userId 사용자 ID
   */
  async registConnection(roomId: string, userId: string): Promise<void> {
    const key = `con:${roomId}:${userId}`;
    const previousServerId = await this.redis.getset(
      key,
      this.serverId.toString(),
    );

    // 이미 다른 서버에 연결되어 있는 경우
    if (previousServerId && previousServerId !== this.serverId.toString()) {
      console.log(
        `Connection already exists on server ${previousServerId}: ${key}`,
      );

      const deleteCommand: ServerCommand = {
        command: 'delete',
        prev_server_id: parseInt(previousServerId),
        room_id: roomId,
        user_id: userId,
      };

      await this.publishMessage(
        `server_command:${previousServerId}`,
        deleteCommand,
      );
    }
  }

  /**
   * Redis에서 연결 정보를 제거합니다.
   * @param roomId 채팅방 ID (broadcaster_id)
   * @param userId 사용자 ID
   * @returns 삭제된 키의 개수
   */
  async removeConnection(roomId: string, userId: string): Promise<number> {
    const key = `con:${roomId}:${userId}`;
    console.log(`Removing redis connection: ${key}`);
    return await this.del(key);
  }

  /**
   * 시청자 등록
   * @param broadcasterId 방송자 ID
   * @param userId 시청자 ID
   */
  async registViewer(broadcasterId: string, userId: string, userIdx, nickname, role): Promise<void> {
    const key = `viewer:${broadcasterId}`;
    await this.hset(key, userId, JSON.stringify({
      user_id: userId,
      user_idx: userIdx,
      nickname: nickname,
      role: role,
    }));
  }

  /**
   * 시청자 제거
   * @param broadcasterId 방송자 ID
   * @param userId 시청자 ID
   */
  async removeViewer(broadcasterId: string, userId: string): Promise<void> {
    const key = `viewer:${broadcasterId}`;
    console.log(`[Remove Viewer] ${userId} from ${broadcasterId}`);
    await this.hdel(key, userId);
  }

  /**
   * 방송 종료시 viewer 해시 키 전체 삭제
   * @param broadcasterId 방송자 ID
   * @returns 삭제된 키의 개수
   */
  async removeViewerKey(broadcasterId: string): Promise<number> {
    const key = `viewer:${broadcasterId}`;
    console.log(`[Broadcast End] Deleting viewer key: ${key}`);
    return await this.del(key);
  }

  /**
   * Redis 해시의 필드 개수를 반환합니다.
   * @param key 해시 키
   * @returns 해시에 포함된 필드의 개수
   */
  async getHashFieldCount(key: string): Promise<number> {
    return await this.hlen(key);
  }

  /**
   * Redis 해시의 모든 필드와 값을 가져옵니다.
   * @param key 해시 키
   * @returns 필드와 값의 객체 형태 (빈 객체일 수 있음)
   */
  async getHashAll(key: string): Promise<{ [field: string]: string }> {
    return await this.redis.hgetall(key);
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
  private async hset(
    key: string,
    field: string,
    value: string,
  ): Promise<number> {
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
   * Redis 해시에서 하나 이상의 필드를 삭제합니다.
   * @param key 해시 키
   * @param fields 삭제할 필드 이름 또는 필드 이름 배열
   * @returns 삭제된 필드 수
   */
  private async hdel(key: string, fields: string | string[]): Promise<number> {
    if (Array.isArray(fields)) {
      return await this.redis.hdel(key, ...fields);
    }
    return await this.redis.hdel(key, fields);
  }

  /**
   * Redis 해시의 필드 개수를 반환합니다.
   * @param key 해시 키
   * @returns 해시에 포함된 필드의 개수
   */
  private async hlen(key: string): Promise<number> {
    return await this.redis.hlen(key);
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
  getServerId(): number {
    return this.serverId;
  }

  /**
   * 일일 추천 기록을 확인합니다.
   * @param viewerIdx 시청자 ID
   * @param broadcasterIdx 방송자 ID
   * @param date 날짜 (YYYY-MM-DD 형식)
   * @returns 이미 추천을 했으면 true, 아니면 false
   */
  async checkDailyRecommend(
    viewerIdx: number,
    broadcasterIdx: number,
    date: string,
  ): Promise<boolean> {
    const key = `recommend:daily:${date}`;
    const field = `${viewerIdx}:${broadcasterIdx}`;
    const value = await this.hget(key, field);
    return value !== null;
  }

  /**
   * 일일 추천 기록을 저장합니다.
   * @param viewerIdx 시청자 ID
   * @param broadcasterIdx 방송자 ID
   * @param date 날짜 (YYYY-MM-DD 형식)
   * @returns 새 필드가 생성되면 1, 기존 필드가 업데이트되면 0
   */
  async recordDailyRecommend(
    viewerIdx: number,
    broadcasterIdx: number,
    date: string,
  ): Promise<number> {
    const key = `recommend:daily:${date}`;
    const field = `${viewerIdx}:${broadcasterIdx}`;

    // 키가 처음 생성되는 경우에만 TTL 설정
    const exists = await this.exists(key);
    const result = await this.hset(key, field, '1');

    if (!exists) {
      // 다음날 자정까지의 초 계산 (KST 기준)
      const now = new Date();
      const kstNow = new Date(
        now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }),
      );
      const tomorrow = new Date(kstNow);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const ttlSeconds = Math.floor(
        (tomorrow.getTime() - kstNow.getTime()) / 1000,
      );
      await this.expire(key, ttlSeconds);
    }

    return result;
  }

  /**
   * 특정 날짜의 모든 추천 기록을 삭제합니다.
   * @param date 날짜 (YYYY-MM-DD 형식)
   * @returns 삭제된 키의 개수
   */
  async deleteDailyRecommends(date: string): Promise<number> {
    const key = `recommend:daily:${date}`;
    return await this.del(key);
  }

  /**
   * 패턴과 일치하는 모든 키를 조회합니다.
   * @param pattern 조회할 키 패턴
   * @returns 패턴과 일치하는 키 배열
   */
  async findKeysByPattern(pattern: string): Promise<string[]> {
    return await this.redis.keys(pattern);
  }

  /**
   * 여러 키를 한번에 삭제합니다.
   * @param keys 삭제할 키 배열
   * @returns 삭제된 키의 개수
   */
  async deleteMultipleKeys(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return await this.del(keys);
  }
}
