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
    // 1. 해당 사용자 정보 조회
    const user = await this.userService.findByUserIdx(userIdx);
    if (!user) {
      throw new BadRequestException('존재하지 않는 사용자입니다.');
    }

    // 2. Redis에서 해당 사용자의 시청자 정보 확인 (방송 참여 여부 및 방송 중인지 확인)
    const viewerInfo = await this.redisService.getViewerInfo(broadcasterId, user.user_id);
    if (!viewerInfo) {
      throw new BadRequestException('방송에 참여하지 않았거나 방송이 진행 중이지 않습니다.');
    }

    // 3. Redis에서 가져온 시청자 정보 파싱
    let parsedViewerInfo;
    try {
      parsedViewerInfo = JSON.parse(viewerInfo);
      console.log('Parsed Viewer Info:', parsedViewerInfo);
    } catch (error) {
      throw new BadRequestException('시청자 정보를 불러올 수 없습니다.');
    }

    // 4. 채팅 메시지 발송
    await this.redisService.publishRoomMessage(
      `room:${broadcasterId}`, 
      RedisMessages.chat(
        broadcasterId,
        user.idx,
        user.user_id,
        user.nickname,
        message,
        user.profile_img,
        parsedViewerInfo.role,
        parsedViewerInfo.fan_level.name,
        parsedViewerInfo.fan_level.color,
      )
    );
    
    return {
      message: '성공적으로 채팅을 전송하였습니다.',
    };
  }
}
