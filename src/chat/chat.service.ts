import { BadRequestException, Injectable } from '@nestjs/common';
import { EventsGateway } from './chat.gateway';
import { UserService } from 'src/user/user.service';
import { RedisService } from 'src/redis/redis.service';
import { FanService } from 'src/fan/fan.service';
import { FanLevel, User } from '@prisma/client';
import { ManagerService } from 'src/manager/manager.service';
import { RedisMessages } from 'src/redis/interfaces/message-namespace';

@Injectable()
export class ChatService {
  constructor(
    private readonly eventsGateway: EventsGateway,
    private readonly userService: UserService,
    private readonly redisService: RedisService,
    private readonly fanService: FanService,
    private readonly managerService: ManagerService,
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
    let { grade, color } = this.getGradeAndColor(fanLevels, donation);
    const role = await this.getRole(user, broadcaster);
    if (role === 'broadcaster') {
    }
    else if (role === 'manager') {
      color = '#3EB350';
    }


    await this.redisService.publishMessage(
      `room:${broadcasterId}`, 
      RedisMessages.chat(
        broadcaster.user_id,
        user.idx,
        user.user_id,
        user.nickname,
        message,
        grade,
        color,
        role
      )
    );
    return {
      message: '성공적으로 채팅을 전송하였습니다.',
    };
  }
  
  getGradeAndColor(fanLevels: FanLevel[], min_donation: number) {
    let grade='normal';
    let color='#6B7280'
    for (const level of fanLevels) {
      if (min_donation >= level.min_donation) {
        grade = level.name;
        color = level.color;
        break;
      }
    }
    return { grade, color };
  }

  async getRole(user: User, broadcaster: User): Promise<'broadcaster' | 'manager' | 'viewer'> {
    if (user.idx === broadcaster.idx) {
      return 'broadcaster';
    }
    const isManager = await this.managerService.isManager(user.idx, broadcaster.idx);
    if (isManager) {
      return 'manager';
    }
    return 'viewer';
  }

}
