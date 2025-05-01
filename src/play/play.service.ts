import { BadRequestException, Injectable } from '@nestjs/common';
import { BroadcastSettingService } from 'src/broadcast-setting/broadcast-setting.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class PlayService {
  constructor(
    private readonly userService: UserService,
    private readonly braodcastSettingService: BroadcastSettingService,
  ) {}

  async play(userIdx, streamerId, isGuest, password) {
    const streamer = await this.userService.getUserByUserIdWithRelations(
      streamerId,
      {
        ivs_channel: true,
        braodcast_setting: true,
      },
    );
    if (!streamer) {
      throw new BadRequestException('존재하지 않는 스트리머입니다.');
    }
    const bookmark = await this.userService.getBookmarkByStreamerIdx(
      userIdx,
      streamer.idx,
    );
    if (isGuest) {
      if (
        streamer.broadcastSetting.is_adult ||
        streamer.broadcastSetting.is_fan ||
        streamer.broadcastSetting.is_pw
      ) {
        throw new BadRequestException('게스트는 시청할 수 없습니다');
      }
      return {
        playback_url: streamer.ivs.playback_url,
        title: streamer.broadcastSetting.title,
        is_bookmarked: false,
        profile_img: streamer.profile_img,
        nickname: streamer.nickname,
      };
    }

    const user = await this.userService.findByUserIdx(userIdx);
    if (!user) {
      throw new BadRequestException('탈퇴한 유저입니다.');
    }

    if (user.idx == streamer.idx) {
      return {
        playback_url: streamer.ivs.playback_url,
        title: streamer.broadcastSetting.title,
        is_bookmarked: false,
        profile_img: streamer.profile_img,
        nickname: streamer.nickname,
      };
    }

    if (streamer.broadcastSetting.is_adult) {
      //성인 여부 검사 로직
    }
    if (streamer.broadcastSetting.is_fan) {
      // 팬 여부 검사 로직
    }
    if (streamer.broadcastSetting.is_pw) {
      if (password != streamer.broadcastSetting.password) {
        throw new BadRequestException('비밀번호가 틀렸습니다');
      }
    }
    return {
      playback_url: streamer.ivs.playback_url,
      is_bookmarked: bookmark ? true : false,
      title: streamer.broadcastSetting.title,
      profile_img: streamer.profile_img,
      nickname: streamer.nickname,
    };
  }
}
