import {
  BadRequestException,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { StreamService } from 'src/stream/stream.service';
import { UserService } from 'src/user/user.service';
import { BlacklistService } from 'src/blacklist/blacklist.service';
import { BookmarkService } from 'src/bookmark/bookmark.service';

@Injectable()
export class PlayService {
  constructor(
    private readonly userService: UserService,
    private readonly streamService: StreamService,
    private readonly authService: AuthService,
    private readonly blacklistService: BlacklistService,
    private readonly bookmarkService: BookmarkService,
  ) {}

  async play(userIdx, streamerId, isGuest, guestId, password) {
    const broadcaster = await this.userService.getUserByUserIdWithRelations(
      streamerId,
      {
        ivs_channel: true,
        braodcast_setting: true,
      },
    );
    if (!broadcaster) {
      throw new BadRequestException('존재하지 않는 스트리머입니다.');
    }
    const stream = await this.streamService.getStreamByUserIdx(broadcaster.idx);
    if (!stream) {
      throw new BadRequestException('방송중인 스트리머가 아닙니다.');
    }
    
    // 스트리머의 북마크 개수 조회
    const bookmarkData = await this.bookmarkService.getUserBookmarkCount(broadcaster.idx);
    if (isGuest) {
      if (
        broadcaster.broadcastSetting.is_adult ||
        broadcaster.broadcastSetting.is_fan ||
        broadcaster.broadcastSetting.is_pw
      ) {
        throw new BadRequestException('게스트는 시청할 수 없습니다');
      }
      const playToken = this.authService.generatePlayToken({
        broadcaster_idx: broadcaster.idx,
        broadcaster_id: broadcaster.user_id,
        broadcaster_nickname: broadcaster.nickname,
        type: 'guest',
        stream_idx: stream.id,
        stream_id: stream.stream_id,
        guest_uuid: guestId,
      });
      return {
        broadcaster_idx: broadcaster.idx,
        broadcaster_id: broadcaster.user_id,
        broadcaster_nickname: broadcaster.nickname,
        playback_url: broadcaster.ivs.playback_url,
        title: broadcaster.broadcastSetting.title,
        is_bookmarked: false,
        profile_img: broadcaster.profile_img,
        nickname: broadcaster.nickname,
        play_cnt: stream.play_cnt,
        recommend_cnt: stream.recommend_cnt,
        bookmark_cnt: bookmarkData.count,
        start_time: stream.start_time,
        play_token: playToken.token,
      };
    }
    const bookmark = await this.userService.getBookmarkByStreamerIdx(
      userIdx,
      broadcaster.idx,
    );
    const user = await this.userService.findByUserIdx(userIdx);
    if (!user) {
      throw new BadRequestException('탈퇴한 유저입니다.');
    }

    // 블랙리스트 체크 (본인이 아닌 경우에만)
    if (user.idx !== broadcaster.idx) {
      const isBlocked = await this.blacklistService.isUserBlocked(
        broadcaster.idx,
        user.idx,
      );
      if (isBlocked) {
        throw new ForbiddenException(
          '해당 방송에 제재된 사용자입니다',
        );
      }
    }

    if (user.idx === broadcaster.idx) {
      const playToken = this.authService.generatePlayToken({
        broadcaster_idx: broadcaster.idx,
        broadcaster_id: broadcaster.user_id,
        broadcaster_nickname: broadcaster.nickname,
        type: 'owner',
        user_idx: user.idx,
        user_id: user.user_id,
        stream_idx: stream.id,
        stream_id: stream.stream_id,
      });
      return {
        broadcaster_idx: broadcaster.idx,
        broadcaster_id: broadcaster.user_id,
        broadcaster_nickname: broadcaster.nickname,
        playback_url: broadcaster.ivs.playback_url,
        title: broadcaster.broadcastSetting.title,
        is_bookmarked: bookmark.is_bookmarked ? true : false,
        profile_img: broadcaster.profile_img,
        nickname: broadcaster.nickname,
        play_cnt: stream.play_cnt,
        recommend_cnt: stream.recommend_cnt,
        bookmark_cnt: bookmarkData.count,
        start_time: stream.start_time,
        play_token: playToken.token,
      };
    }

    if (broadcaster.broadcastSetting.is_adult) {
      //성인 여부 검사 로직
    }
    if (broadcaster.broadcastSetting.is_fan) {
      // 팬 여부 검사 로직
    }
    if (broadcaster.broadcastSetting.is_pw) {
      if (password != broadcaster.broadcastSetting.password) {
        throw new BadRequestException('비밀번호가 틀렸습니다');
      }
    }
    const playToken = this.authService.generatePlayToken({
      broadcaster_idx: broadcaster.idx,
      broadcaster_id: broadcaster.user_id,
      broadcaster_nickname: broadcaster.nickname,
      type: 'member',
      user_idx: user.idx,
      user_id: user.user_id,
      stream_idx: stream.id,
      stream_id: stream.stream_id,
    });
    return {
      broadcaster_idx: broadcaster.idx,
      broadcaster_id: broadcaster.user_id,
      broadcaster_nickname: broadcaster.nickname,
      playback_url: broadcaster.ivs.playback_url,
      is_bookmarked: bookmark.is_bookmarked ? true : false,
      title: broadcaster.broadcastSetting.title,
      profile_img: broadcaster.profile_img,
      nickname: broadcaster.nickname,
      play_cnt: stream.play_cnt,
      recommend_cnt: stream.recommend_cnt,
      bookmark_cnt: bookmarkData.count,
      start_time: stream.start_time,
      play_token: playToken.token,
    };
  }
}
