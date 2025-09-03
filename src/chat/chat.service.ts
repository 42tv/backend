import { BadRequestException, Injectable } from '@nestjs/common';
import { EventsGateway } from './chat.gateway';
import { UserService } from 'src/user/user.service';
import { RedisService } from 'src/redis/redis.service';
import { FanService } from 'src/fan/fan.service';
import { ManagerService } from 'src/manager/manager.service';
import { RedisMessages } from 'src/redis/interfaces/message-namespace';
import { ViewerInfo } from 'src/redis/interfaces/room.message';
import { ErrorMessages } from 'src/common/error-messages';

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
      throw new BadRequestException(ErrorMessages.USER.NOT_FOUND);
    }

    // 2. Redis에서 해당 사용자의 시청자 정보 확인 (방송 참여 여부 및 방송 중인지 확인)
    const viewerInfo = await this.redisService.getViewerInfo(
      broadcasterId,
      user.user_id,
    );
    if (!viewerInfo) {
      throw new BadRequestException(ErrorMessages.BROADCASTER.NOT_BROADCASTING);
    }

    // 3. Redis에서 가져온 시청자 정보 파싱
    let parsedViewerInfo: ViewerInfo;
    try {
      parsedViewerInfo = JSON.parse(viewerInfo);
      console.log('Parsed Viewer Info:', parsedViewerInfo);
    } catch (error) {
      throw new BadRequestException(ErrorMessages.USER.VIEWER_INFO_UNAVAILABLE);
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
        parsedViewerInfo.grade,
        parsedViewerInfo.color,
      ),
    );

    return {
      message: '성공적으로 채팅을 전송하였습니다.',
    };
  }
}
