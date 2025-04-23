import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { BroadcastSettingService } from 'src/broadcast-setting/broadcast-setting.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class PlayService {
  constructor(
    private readonly userService: UserService,
    private readonly braodcastSettingService: BroadcastSettingService,
  ) {}

  async play(userIdx, streamerId, password) {
    const user = await this.userService.findByUserIdx(userIdx);
    const streamer = await this.userService.findByUserId(streamerId);
    const streamerSetting =
      await this.braodcastSettingService.getBroadcastSetting(streamer.idx);
    if (!streamerSetting) {
      throw new InternalServerErrorException('스트리머 방송 설정이 없습니다.');
    }
    if (streamerSetting.is_adult) {
      //성인 여부 검사 로직
    }
    if (streamerSetting.is_fan) {
      // 팬 여부 검사 로직
    }
    if (streamerSetting.is_pw) {
      if (password != streamerSetting.password) {
        throw new BadRequestException('비밀번호가 틀렸습니다');
      }
    }
    return { message: `Playing for user ${streamerId}` };
  }
}
