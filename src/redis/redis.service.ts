import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { EventsGateway } from 'src/chat/chat.gateway';
import { Redis } from 'ioredis';
import { RedisMessages } from './interfaces/message-namespace';
import { ChatPayload, ChatRoomMessage, OpCode, RoleChangePayload, UserJoinPayload, UserLeavePayload, ViewerCountPayload, ViewerInfo } from './interfaces/room.message';
import { ServerMessage, ServerOpCode, DuplicateConnectPayload } from './interfaces/server.message';
import { WebsocketJwt } from 'src/play/interfaces/websocket';
import { getUserRoleColor } from 'src/constants/chat-colors';

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
        await this.handleServerMessage(parsedMessage);
      } else if (channel.startsWith('room:')) {
        await this.handleRoomMessage(parsedMessage);
      }
    } catch (error) {
      console.error(`[Redis] Failed to handle message:`, error);
    }
  }

  /**
   * 서버 메시지 처리
   * @param message 서버 메시지
   */
  private async handleServerMessage(message: ServerMessage) {
    const opCode = message.op;

    switch (opCode) {
      case ServerOpCode.DUPLICATE_CONNECT:
        await this.handleDuplicateConnectMessage(message);
        break;
      default:
        console.warn(`[Redis] Unknown server message op: ${opCode}`);
    }
  }

  /**
   * 중복 연결 메시지 처리
   * @param message 중복 연결 메시지
   */
  private async handleDuplicateConnectMessage(message: ServerMessage) {
    const payload = message.payload as DuplicateConnectPayload;
    console.log(`[Duplicate Connect] received:`, payload);
    
    // EventsGateway를 통해 기존 연결을 끊는다
    await this.eventsGateway.handleDuplicateDisconnect(payload.roomId, payload.disconnectId);
  }

  /**
   * 룸 메시지 처리 (chat, recommend, viewer_count 등)
   * @param message 룸 메시지
   */
  private async handleRoomMessage(message: ChatRoomMessage) {
    const opCode = message.op;

    switch (opCode) {
      case OpCode.VIEWER_COUNT:
        await this.handleViewerCountMessage(message);
        break;
      case OpCode.CHAT:
        await this.handleChatMessage(message);
        break;
      case OpCode.RECOMMEND:
        await this.handleRecommendMessage(message);
        break;
      case OpCode.BOOKMARK:
        await this.handleBookmarkMessage(message);
        break;
      case OpCode.USER_JOIN:
        await this.handleUserJoinMessage(message);
        break;
      case OpCode.USER_LEAVE:
        await this.handleUserLeaveMessage(message);
        break;
      case OpCode.ROLE_CHANGE:
        await this.handleRoleChangeMessage(message);
        break;
      default:
        console.warn(`[Redis] Unknown room message type: ${opCode}`);
    }
  }

  /**
   * 시청자 수 업데이트 메시지 처리
   * @param message 시청자 수 업데이트 메시지
   */
  private async handleViewerCountMessage(message: ChatRoomMessage) {
    const payload = message.payload as ViewerCountPayload;
    await this.eventsGateway.sendToRoom(
      message.broadcaster_id,
      message.op,
      message.payload 
    );
  }


  /**
   * 채팅 메시지 처리
   * 여기서 프론트엔드의 인터페이스에 맞추어 변경해줌
   * @param message 채팅 메시지
   */
  private async handleChatMessage(message: ChatRoomMessage) {
    const chatPayload = message.payload as ChatPayload;
    await this.eventsGateway.sendToRoom(
      message.broadcaster_id,
      message.op,
      {
        type: OpCode.CHAT,
        user_idx: chatPayload.user_idx,
        user_id: chatPayload.user_id,
        nickname: chatPayload.nickname,
        message: chatPayload.message,
        grade: chatPayload.grade,
        color: chatPayload.color,
      }
    );
  }

  /**
   * 추천 메시지 처리
   * @param message 추천 메시지
   */
  private async handleRecommendMessage(message: ChatRoomMessage) {
    console.log(`[Recommend] received:`, message);
    await this.eventsGateway.sendToRoom(
      message.broadcaster_id,
      message.op,
      message.payload
    );
  }

  /**
   * 북마크 메시지 처리
   * @param message 북마크 메시지
   */
  private async handleBookmarkMessage(message: ChatRoomMessage) {
    console.log(`[Bookmark] received:`, message);
    await this.eventsGateway.sendToRoom(
      message.broadcaster_id,
      message.op,
      message.payload
    );
  }

  /**
   * 사용자 입장/퇴장 메시지 처리
   * @param message 사용자 입장/퇴장 메시지
   */
  private async handleUserJoinMessage(message: ChatRoomMessage) {
    // 입장/퇴장 메시지를 관리자 및 방송자에게만 전송
    const payload = message.payload as UserJoinPayload;
    await this.eventsGateway.sendToSpecificUserTypes(
      message.broadcaster_id,
      message.op,
      {
        user_idx: payload.user_idx,
        user_id: payload.user_id,
        nickname: payload.nickname,
        role: payload.jwt_decode
      },
      ['manager', 'broadcaster'],
    );
  }

  /**
   * 사용자 입장/퇴장 메시지 처리
   * @param message 사용자 입장/퇴장 메시지
   */
  private async handleUserLeaveMessage(message: ChatRoomMessage) {
    // 입장/퇴장 메시지를 관리자 및 방송자에게만 전송
    const payload = message.payload as UserLeavePayload;
    await this.eventsGateway.sendToSpecificUserTypes(
      message.broadcaster_id,
      message.op,
      message.payload,
      ['manager', 'broadcaster'],
    );
  }

  /**
   * 역할 변경 메시지 처리
   * @param message 역할 변경 메시지
   */
  private async handleRoleChangeMessage(message: ChatRoomMessage) {
    const payload = message.payload as RoleChangePayload;
    // console.log(
    //   `[RoleChange] - room: ${message.broadcasterId}, target: ${message.targetNickname}(${message.targetUserId}), ${message.previousRole} -> ${message.newRole}, changed by: ${message.changedByNickname}`,
    // );

    // // 역할 변경 메시지를 해당 방의 모든 사용자에게 전송
    // await this.eventsGateway.sendToRoom(
    //   message.broadcasterId,
    //   'role_change',
    //   {
    //     target_user_id: payload.user,
    //     target_user_idx: payload.targetUserIdx,
    //     target_nickname: payload.targetNickname,
    //     previous_role: payload.previousRole,
    //     new_role: payload.newRole,
    //     changed_by_idx: payload.changedByIdx,
    //     changed_by_nickname: payload.changedByNickname,
    //   },
    // );

    // // Redis의 viewer 정보도 업데이트
    // await this.updateViewerRole(
    //   message.broadcasterId,
    //   payload.role.user_id,
    //   payload.role
    // );
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
  async publishRoomMessage(channel: string, message: ChatRoomMessage | ServerMessage): Promise<void> {
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
    const key = `con:${roomId}`;
    const previousServerId = await this.hget(key, userId);

    // 새로운 서버 ID를 해시에 저장
    await this.hset(key, userId, this.serverId.toString());

    // 이미 다른 서버에 연결되어 있는 경우
    if (previousServerId && previousServerId !== this.serverId.toString()) {
      console.log(
        `Connection already exists on server ${previousServerId}: ${key}:${userId}`,
      );
      // 해당 서버에 중복 연결이라는 redis 이벤트 발행
      const duplicateConnect = RedisMessages.duplicateConnect(
        parseInt(previousServerId),
        roomId,
        userId,
      );
      await this.publishRoomMessage(
        `server_command:${previousServerId}`,
        duplicateConnect,
      );
    }
  }

  /**
   * Redis에서 연결 정보를 제거합니다.
   * @param roomId 채팅방 ID (broadcaster_id)
   * @param userId 사용자 ID
   * @returns 삭제된 필드의 개수
   */
  async removeConnection(roomId: string, userId: string): Promise<number> {
    const key = `con:${roomId}`;
    console.log(`Removing redis connection: ${key}, hash key:${userId}`);
    return await this.hdel(key, userId);
  }

  /**
   * Redis에서 연결 정보를 확인합니다.
   * @param roomId 채팅방 ID (broadcaster_id)
   * @param userId 사용자 ID
   * @returns 연결된 서버 ID 또는 null
   */
  async getConnection(roomId: string, userId: string): Promise<string | null> {
    const key = `con:${roomId}`;
    return await this.hget(key, userId);
  }

  /**
   * 시청자 등록
   * @param broadcasterId 방송자 ID
   * @param userId 시청자 ID
   */
  async registViewer(
    broadcasterId: string,
    userId: string,
    jwt: WebsocketJwt
  ): Promise<void> {
    const key = `viewer:${broadcasterId}`;

    // fan_level이 있으면 사용하고, 없으면 역할에 따른 기본 색상 사용
    const fanLevel = (jwt.user.fan_level && !jwt.user.is_guest) ? {
      name: jwt.user.fan_level.name,
      color: jwt.user.fan_level.color,
    } : {
      name: jwt.user.role,
      color: getUserRoleColor(jwt.user.role),
    };

    await this.hset(key, userId, JSON.stringify({
      user_id: userId,
      user_idx: jwt.user.idx,
      nickname: jwt.user.nickname,
      role: jwt.user.role,
      fan_level: fanLevel
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
   * 특정 시청자 정보 조회
   * @param broadcasterId 방송자 ID
   * @param userId 시청자 ID
   * @returns 시청자 정보 JSON 문자열 또는 null
   */
  async getViewerInfo(broadcasterId: string, userId: string): Promise<string | null> {
    const key = `viewer:${broadcasterId}`;
    return await this.hget(key, userId);
  }

  /**
   * 시청자 역할 업데이트
   * @param broadcasterId 방송자 ID
   * @param userId 사용자 ID
   * @param newRole 새로운 역할
   */
  // async updateViewerRole(broadcasterId: string, userId: string, newRole: string): Promise<void> {
  //   const key = `viewer:${broadcasterId}`;
  //   const viewerData = await this.hget(key, userId);
    
  //   if (viewerData) {
  //     const viewer = JSON.parse(viewerData);
  //     viewer.role = newRole;
  //     await this.hset(key, userId, JSON.stringify(viewer));
  //     console.log(`[Update Viewer Role] ${userId} role changed to ${newRole} in ${broadcasterId}`);
  //   }
  // }

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
   * 특정 방송자의 시청자 목록을 조회합니다.
   * @param broadcasterId 방송자의 user_id
   * @returns 시청자 정보 배열
   */
  async getViewersList(broadcasterId: string): Promise<ViewerInfo[]> {
    const viewerKey = `viewer:${broadcasterId}`;
    const viewerData = await this.getHashAll(viewerKey);

    // viewerData를 순회하여 value 값을 객체로 만들어 배열로 변환
    const viewers = Object.entries(viewerData).map(([key, value]) => {
      try {
        // value가 JSON 문자열인 경우 파싱
        return typeof value === 'string' ? JSON.parse(value) : value;
      } catch (error) {
        // JSON 파싱에 실패한 경우 원본 value 반환
        return {
          user_id: key,
          user_idx: -1,
          nickname: 'guest',
          role: 'guest',
        };
      }
    });

    return viewers;
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
