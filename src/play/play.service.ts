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

export interface PlayResponse {
  broadcaster: {
    idx: number;
    user_id: string;
    nickname: string;
    profile_img: string;
  };
  stream: {
    title: string;
    playback_url: string;
    play_cnt: number;
    recommend_cnt: number;
    bookmark_cnt: number;
    start_time: string;
  };
  user: {
    is_bookmarked: boolean;
    play_token: string;
    role: string;
  };
}

@Injectable()
export class PlayService {
  constructor(
    private readonly userService: UserService,
    private readonly streamService: StreamService,
    private readonly authService: AuthService,
    private readonly blacklistService: BlacklistService,
    private readonly bookmarkService: BookmarkService,
  ) {}

  async play(
    userIdx: number,
    streamerId: string,
    isGuest: boolean,
    guestId: string,
    password: string,
  ) : Promise<PlayResponse> {
    // 기본 데이터 조회
    const { broadcaster, stream, bookmarkData } = await this.getBasicPlayData(streamerId);
    
    if (isGuest) {
      return this.handleGuestPlay(broadcaster, stream, bookmarkData, guestId);
    }
    
    const user = await this.validateUser(userIdx);
    const bookmark = await this.userService.getBookmarkByStreamerIdx(userIdx, broadcaster.idx);
    
    // 블랙리스트 체크 (본인이 아닌 경우에만)
    if (user.idx !== broadcaster.idx) {
      await this.checkBlacklist(broadcaster.idx, user.idx);
    }
    
    if (user.idx === broadcaster.idx) {
      return this.handleOwnerPlay(broadcaster, stream, bookmarkData, bookmark, user);
    }
    
    // Manager 여부 확인 - 실제 구현에서는 적절한 조건으로 변경 필요
    // 예: user 테이블에 role 필드가 있거나, 별도 manager 테이블이 있는 경우
    if (user.role === 'manager' || await this.checkIfUserIsManager(user.idx, broadcaster.idx)) {
      return this.handleManagerPlay(broadcaster, stream, bookmarkData, bookmark, user);
    }
    
    // 일반 회원 접근 제한 검증
    await this.validateMemberAccess(broadcaster, password);
    
    return this.handleMemberPlay(broadcaster, stream, bookmarkData, bookmark, user);
  }

  private async getBasicPlayData(streamerId: string) {
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
    
    const bookmarkData = await this.bookmarkService.getUserBookmarkCount(broadcaster.idx);
    
    return { broadcaster, stream, bookmarkData };
  }

  private async validateUser(userIdx: number) {
    const user = await this.userService.findByUserIdx(userIdx);
    if (!user) {
      throw new BadRequestException('탈퇴한 유저입니다.');
    }
    return user;
  }

  private async checkBlacklist(broadcasterIdx: number, userIdx: number) {
    const isBlocked = await this.blacklistService.isUserBlocked(broadcasterIdx, userIdx);
    if (isBlocked) {
      throw new ForbiddenException('해당 방송에 제재된 사용자입니다');
    }
  }

  private async validateGuestAccess(broadcaster: any) {
    if (
      broadcaster.broadcastSetting.is_adult ||
      broadcaster.broadcastSetting.is_fan ||
      broadcaster.broadcastSetting.is_pw
    ) {
      throw new BadRequestException('게스트는 시청할 수 없습니다');
    }
  }

  private async validateMemberAccess(broadcaster: any, password?: string) {
    if (broadcaster.broadcastSetting.is_adult) {
      // 성인 여부 검사 로직
    }
    if (broadcaster.broadcastSetting.is_fan) {
      // 팬 여부 검사 로직
    }
    if (broadcaster.broadcastSetting.is_pw) {
      if (password !== broadcaster.broadcastSetting.password) {
        throw new BadRequestException('비밀번호가 틀렸습니다');
      }
    }
  }

  private async handleGuestPlay(
    broadcaster: any,
    stream: any,
    bookmarkData: any,
    guestId: string,
  ): Promise<PlayResponse> {
    await this.validateGuestAccess(broadcaster);
    
    const playToken = this.authService.generatePlayToken({
      broadcaster_idx: broadcaster.idx,
      broadcaster_id: broadcaster.user_id,
      broadcaster_nickname: broadcaster.nickname,
      type: 'guest',
      stream_idx: stream.id,
      stream_id: stream.stream_id,
      guest_uuid: guestId,
    });

    return this.createPlayResponse(broadcaster, stream, bookmarkData, false, playToken.token, 'guest');
  }

  private async handleOwnerPlay(
    broadcaster: any,
    stream: any,
    bookmarkData: any,
    bookmark: any,
    user: any,
  ): Promise<PlayResponse> {
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

    return this.createPlayResponse(
      broadcaster,
      stream,
      bookmarkData,
      bookmark.is_bookmarked ? true : false,
      playToken.token,
      'owner',
    );
  }

  private async handleManagerPlay(
    broadcaster: any,
    stream: any,
    bookmarkData: any,
    bookmark: any,
    user: any,
  ): Promise<PlayResponse> {
    const playToken = this.authService.generatePlayToken({
      broadcaster_idx: broadcaster.idx,
      broadcaster_id: broadcaster.user_id,
      broadcaster_nickname: broadcaster.nickname,
      type: 'manager',
      user_idx: user.idx,
      user_id: user.user_id,
      stream_idx: stream.id,
      stream_id: stream.stream_id,
    });

    return this.createPlayResponse(
      broadcaster,
      stream,
      bookmarkData,
      bookmark.is_bookmarked ? true : false,
      playToken.token,
      'manager',
    );
  }

  private async handleMemberPlay(
    broadcaster: any,
    stream: any,
    bookmarkData: any,
    bookmark: any,
    user: any,
  ): Promise<PlayResponse> {
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

    return this.createPlayResponse(
      broadcaster,
      stream,
      bookmarkData,
      bookmark.is_bookmarked ? true : false,
      playToken.token,
      'member',
    );
  }

  private createPlayResponse(
    broadcaster: any,
    stream: any,
    bookmarkData: any,
    isBookmarked: boolean,
    playToken: string,
    role: string,
  ): PlayResponse {
    return {
      broadcaster: {
        idx: broadcaster.idx,
        user_id: broadcaster.user_id,
        nickname: broadcaster.nickname,
        profile_img: broadcaster.profile_img,
      },
      stream: {
        title: broadcaster.broadcastSetting.title,
        playback_url: broadcaster.ivs.playback_url,
        play_cnt: stream.play_cnt,
        recommend_cnt: stream.recommend_cnt,
        bookmark_cnt: bookmarkData.count,
        start_time: stream.start_time,
      },
      user: {
        is_bookmarked: isBookmarked,
        play_token: playToken,
        role: role,
      },
    };
  }
}
