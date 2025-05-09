import { Injectable } from '@nestjs/common';
import { EventsGateway } from './chat.gateway';
import { UserService } from 'src/user/user.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly eventsGateway: EventsGateway,
    private readonly userService: UserService,
    private readonly redisService: RedisService,
  ) {}

  async sendChattingMessage(
    userIdx: number,
    broadcasterId: string,
    message: string,
  ) {
    // Emit the message to the WebSocket
    const user = await this.userService.getUserWithRelations(userIdx, {});
    await this.redisService.publicshMessage('chatting', {
      broadcaster_id: broadcasterId,
      id: user.user_id,
      nickname: user.nickname,
      message: message,
    });
    return {
      message: '성공적으로 채팅을 전송하였습니다.',
    };
  }
}
