import { BadRequestException, Injectable } from '@nestjs/common';
import { EventsGateway } from './chat.gateway';
import { UserService } from 'src/user/user.service';
import { RedisService } from 'src/redis/redis.service';
import { FanService } from 'src/fan/fan.service';
import { FanLevel, User } from '@prisma/client';

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
    const user = await this.userService.getUserWithRelations(userIdx, {});
    const broadcaster = await this.userService.getUserByUserIdWithRelations(broadcasterId, {
      fan_level: true,
    });
    if (!broadcaster) {
      throw new BadRequestException('방송인을 찾을 수 없습니다');
    }
    const fan = await this.fanService.findFan(user.idx, broadcaster.idx);
    const donation = fan ? fan.total_donation : 0;
    const fanLevels = broadcaster.fanLevel;

    let userFanLevel = null;
    console.log(fanLevels);
    for (const level of fanLevels) {
      if (donation >= level.min_donation) {
        userFanLevel = level;
        break; // 가장 높은 레벨만 사용
      }
    }

    await this.redisService.publishMessage(`room:${broadcasterId}`, {
      type: 'chat',
      broadcaster_id: broadcasterId,
      chatter_idx: user.idx,
      chatter_nickname: user.nickname,
      chatter_message: message,
          // role: fanLevel.level.name,
          // color: fanGrade.level.color,
    });
    return {
      message: '성공적으로 채팅을 전송하였습니다.',
    };
  }
  
  calculateFanGrade(fanRelation, ) {

  }

}
