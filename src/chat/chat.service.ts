import { Injectable } from '@nestjs/common';
import { EventsGateway } from './chat.gateway';
import { UserService } from 'src/user/user.service';
import { RedisService } from 'src/redis/redis.service';
import { FanLevelService } from 'src/fan-level/fan-level.service';
import { FanService } from 'src/fan/fan.service';
import { ManagerService } from 'src/manager/manager.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly eventsGateway: EventsGateway,
    private readonly userService: UserService,
    private readonly redisService: RedisService,
    private readonly fanService: FanService,
  ) {}

  async sendChattingMessage(
    userIdx: number,
    broadcasterId: string,
    message: string,
  ) {
    // Emit the message to the WebSocket
    const user = await this.userService.getUserWithRelations(userIdx, {});
    const broadcaster = await this.userService.getUserByUserIdWithRelations(broadcasterId, {});
    const fanGrade = await this.fanService.getFanLevel(user.idx, broadcaster.idx);

    await this.redisService.publishMessage(`room:${broadcasterId}`, {
      type: 'chat',
      broadcaster_id: broadcasterId,
      chatter_idx: user.idx,
      chatter_nickname: user.nickname,
      chatter_message: message,
      role: fanGrade.level.name,
      color: fanGrade.level.color,
    });
    return {
      message: '성공적으로 채팅을 전송하였습니다.',
    };
  }
}
