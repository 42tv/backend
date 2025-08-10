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
import { ManagerService } from 'src/manager/manager.service';
import { Stream } from '@prisma/client';
import { PlayResponse } from './interfaces/response';
import { WebsocketJwt } from './interfaces/websocket';
import { FanService } from 'src/fan/fan.service';
import { getUserRoleColor } from 'src/constants/chat-colors';

@Injectable()
export class PlayService {
  constructor(
    private readonly userService: UserService,
    private readonly streamService: StreamService,
    private readonly authService: AuthService,
    private readonly blacklistService: BlacklistService,
    private readonly bookmarkService: BookmarkService,
    private readonly managerService: ManagerService, // ManagerService가 필요하다면 주입
    private readonly fanService: FanService,
  ) {}

  async play(
    userIdx: number,
    streamerId: string,
    isGuest: boolean,
    guestId: string,
    password: string,
  ): Promise<PlayResponse> {
    // 기본 데이터 조회
    const { broadcaster, stream, bookmarkCount } =
      await this.getBasicPlayData(streamerId);
    if (isGuest) {
      return this.handleGuestPlay(broadcaster, stream, bookmarkCount, guestId);
    }

    const user = await this.userService.findByUserIdx(userIdx);
    const bookmark = await this.userService.getBookmarkByStreamerIdx(
      userIdx,
      broadcaster.idx,
    );

    // 블랙리스트 체크 (본인이 아닌 경우에만)
    if (user.idx !== broadcaster.idx) {
      await this.validateGuestAccess(broadcaster);
      await this.checkBlacklist(broadcaster.idx, user.idx);
    }

    if (user.idx === broadcaster.idx) {
      return this.handleUserPlay(
        broadcaster,
        stream,
        bookmarkCount,
        bookmark,
        user,
        'broadcaster',
      );
    }

    // Manager 여부 확인
    const isManager = await this.managerService.isManager(
      user.idx,
      broadcaster.idx,
    );
    if (isManager) {
      return this.handleUserPlay(
        broadcaster,
        stream,
        bookmarkCount,
        bookmark,
        user,
        'manager',
      );
    }

    // Member 여부 확인 (특정 조건을 만족하는 일반 회원)
    const fan = await this.fanService.findFan(userIdx, broadcaster.idx);
    if (fan) {
      // Member는 일부 제한 사항을 우회할 수 있음
      await this.validateMemberAccess(broadcaster, password);
      return this.handleUserPlay(
        broadcaster,
        stream,
        bookmarkCount,
        bookmark,
        user,
        'member',
      );
    }

    // 일반 Viewer - 모든 제한 사항 적용
    await this.validateViewerAccess(broadcaster, password, user);
    return this.handleUserPlay(
      broadcaster,
      stream,
      bookmarkCount,
      bookmark,
      user,
      'viewer',
    );
  }

  private async getBasicPlayData(streamerId: string) {
    const broadcaster = await this.userService.getUserByUserIdWithRelations(
      streamerId,
      {
        ivs_channel: true,
        broadcast_setting: true,
      },
    );

    if (!broadcaster) {
      throw new BadRequestException('존재하지 않는 스트리머입니다.');
    }

    const stream = await this.streamService.getStreamByUserIdx(broadcaster.idx);
    if (!stream) {
      throw new BadRequestException('방송중인 스트리머가 아닙니다.');
    }

    const bookmarkCount = (
      await this.bookmarkService.getUserBookmarkCount(broadcaster.idx)
    ).count;

    return { broadcaster, stream, bookmarkCount };
  }

  private async checkBlacklist(broadcasterIdx: number, userIdx: number) {
    const isBlocked = await this.blacklistService.isUserBlocked(
      broadcasterIdx,
      userIdx,
    );
    if (isBlocked) {
      throw new ForbiddenException('해당 방송에 제재된 사용자입니다');
    }
  }

  private async validateGuestAccess(broadcaster: any) {
    if (
      broadcaster.broadcastSetting?.is_adult ||
      broadcaster.broadcastSetting?.is_fan ||
      broadcaster.broadcastSetting?.is_pw
    ) {
      throw new BadRequestException('게스트는 시청할 수 없습니다');
    }
  }

  private async validateMemberAccess(broadcaster: any, password?: string) {
    if (broadcaster.broadcastSetting?.is_adult) {
      // 성인 여부 검사 로직
    }
    if (broadcaster.broadcastSetting?.is_fan) {
      // 팬 여부 검사 로직
    }
    if (broadcaster.broadcastSetting?.is_pw) {
      if (password !== broadcaster.broadcastSetting.password) {
        throw new BadRequestException('비밀번호가 틀렸습니다');
      }
    }
  }

  private async validateViewerAccess(
    broadcaster: any,
    password?: string,
    user?: any,
  ) {
    // Viewer는 가장 제한적인 접근 권한을 가짐
    if (broadcaster.broadcastSetting?.is_adult) {
      // 성인 여부 검사 로직 - Viewer는 더 엄격한 검증 필요
      if (!user.is_adult_verified) {
        throw new BadRequestException('성인 인증이 필요합니다');
      }
    }
    if (broadcaster.broadcastSetting?.is_fan) {
      // 팬 전용 방송 - Viewer는 접근 불가
      throw new BadRequestException('팬 전용 방송입니다');
    }
    if (broadcaster.broadcastSetting?.is_pw) {
      if (password !== broadcaster.broadcastSetting.password) {
        throw new BadRequestException('비밀번호가 틀렸습니다');
      }
    }
  }

  private async handleGuestPlay(
    broadcaster: any, // User 타입 대신 any 사용 (관계 데이터 포함)
    stream: Stream,
    bookmarkCount: any,
    guestId: string,
  ): Promise<PlayResponse> {
    const payload: WebsocketJwt = {
      broadcaster: {
        idx: broadcaster.idx,
        user_id: broadcaster.user_id,
        nickname: broadcaster.nickname,
        profile_img: broadcaster.profile_img,
      },
      user: {
        idx: 0, // 게스트는 idx가 없음
        user_id: '',
        nickname: `guest_${guestId.substring(0, 8)}`, // 게스트 닉네임 생성
        role: 'guest',
        profile_img: '',
        is_guest: true,
        guest_id: guestId,
        fan_level: {
          name: 'guest',
          color: getUserRoleColor('guest'), // 게스트의 팬 레벨 정보
          total_donation: 0,
        },
      },
      stream: {
        idx: stream.idx,
        stream_id: stream.stream_id,
      },
    };
    const playToken = this.authService.generatePlayToken(payload);

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
        bookmark_cnt: bookmarkCount,
        start_time: stream.start_time,
      },
      user: {
        user_idx: 0, // 게스트는 user_idx가 0
        user_id: '',
        nickname: '',
        profile_img: '',
        is_bookmarked: false,
        play_token: playToken.token,
        role: 'guest',
        is_guest: true,
        guest_id: guestId,
      },
    };
  }

  private async handleUserPlay(
    broadcaster: any,
    stream: any,
    bookmarkCount: any,
    bookmark: any,
    user: any,
    role: 'broadcaster' | 'manager' | 'member' | 'viewer',
  ): Promise<PlayResponse> {
    // 팬 레벨 정보 조회 (본인이 아닌 경우에만)
    let fanLevel = null;
    if (user.idx !== broadcaster.idx) {
      fanLevel = await this.fanService.matchFanLevel(user.idx, broadcaster.idx);
    }

    const payload: WebsocketJwt = {
      broadcaster: {
        idx: broadcaster.idx,
        user_id: broadcaster.user_id,
        nickname: broadcaster.nickname,
        profile_img: broadcaster.profile_img,
      },
      user: {
        idx: user.idx,
        user_id: user.user_id,
        nickname: user.nickname,
        role,
        profile_img: user.profile_img,
        is_guest: false,
      },
      stream: {
        idx: stream.idx,
        stream_id: stream.stream_id,
      },
    };
    const playToken = this.authService.generatePlayToken(payload);

    const response: PlayResponse = {
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
        bookmark_cnt: bookmarkCount,
        start_time: stream.start_time,
      },
      user: {
        user_idx: user.idx,
        user_id: user.user_id,
        nickname: user.nickname,
        profile_img: user.profile_img,
        is_bookmarked: bookmark?.is_bookmarked ? true : false,
        play_token: playToken.token,
        role: role,
        is_guest: false,
      },
    };

    // 팬 레벨 정보가 있으면 추가
    if (fanLevel) {
      response.user.fan_level = fanLevel;
    } else {
      response.user.fan_level = {
        name: 'viewer',
        color: getUserRoleColor('viewer'),
        total_donation: 0,
      };
    }

    return response;
  }
}
