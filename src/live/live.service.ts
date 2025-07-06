import { BadRequestException, Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { StreamService } from 'src/stream/stream.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class LiveService {
  constructor(
    private readonly streamService: StreamService,
    private readonly redisService: RedisService,
    private readonly userService: UserService,
  ) {}

  async getLiveList() {
    const lives = await this.streamService.getLiveList();

    // Promise.all을 사용하여 모든 비동기 작업이 완료될 때까지 기다립니다
    const livesWithViewerCount = await Promise.all(
      lives.map(async (live) => {
        // Redis에서 시청자 수 조회
        const viewerCount = await this.redisService.getHashFieldCount(
          `viewer:${live.broadcaster.user_id}`,
        );
        // 기존 live 객체에 viewerCount 속성 추가
        return {
          ...live,
          viewerCount: viewerCount || 0, // 시청자가 없는 경우 0으로 설정
        };
      }),
    );
    return livesWithViewerCount;
  }

  /**
   * 방송자의 추천 수를 1 증가시킴 (하루 1회 제한)
   * @param recommender_idx 추천자의 user_idx
   * @param broadcaster_idx 방송자의 user_idx
   * @returns 업데이트된 Stream 객체
   */
  async recommendLiveStream(recommender_idx: number, broadcaster_idx: number) {
    const broadCaster = await this.userService.findByUserIdx(broadcaster_idx);
    if (!broadCaster) {
      throw new BadRequestException('존재하지 않는 방송자입니다.');
    }
    const recommender = await this.userService.findByUserIdx(recommender_idx);
    // 한국 시간 기준 오늘 날짜 생성 (YYYY-MM-DD 형식)
    const kstDate = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }),
    );
    const today = kstDate.toISOString().split('T')[0];

    // 이미 추천을 했는지 확인
    const alreadyRecommended = await this.redisService.checkDailyRecommend(
      recommender_idx,
      broadcaster_idx,
      today,
    );
    if (alreadyRecommended) {
      throw new BadRequestException('오늘 이미 추천하셨습니다.');
    }

    // 추천 기록 저장
    await this.redisService.recordDailyRecommend(
      recommender_idx,
      broadcaster_idx,
      today,
    );
    // 추천 수 증가
    await this.streamService.increaseRecommend(broadcaster_idx);
    await this.redisService.publishMessage(`room:${broadCaster.user_id}`, {
      type: 'recommend',
      broadcaster_id: broadCaster.user_id,
      recommender_idx: recommender_idx,
      recommender_nickname: recommender.nickname,
    });
    return;
  }

  /**
   * 특정 방송자의 시청자 목록을 조회합니다.
   * @param broadcasterId 방송자의 user_id
   * @returns 시청자 정보 배열
   */
  async getBroadcasterViewers(broadcasterId: string) {
    const viewerKey = `viewer:${broadcasterId}`;
    const viewerData = await this.redisService.getHashAll(viewerKey);

    console.log(viewerData);

    // // 방송자 정보 조회
    // const broadcaster = await this.userService.findByUserId(broadcasterId);
    // if (!broadcaster) {
    //   throw new BadRequestException('존재하지 않는 방송자입니다.');
    // }

    // const viewers = [];
    // for (const [registerId, userIdxStr] of Object.entries(viewerData)) {
    //   const userIdx = parseInt(userIdxStr, 10);
    //   const user = await this.userService.findByUserIdx(userIdx);

    //   if (user) {
        
    //     viewers.push({
    //       user_id: registerId,
    //       user_idx: user.idx,
    //       nickname: user.nickname,
    //       role: role,
    //     });
    //   }
    // }

    return viewerData;
  }
}
