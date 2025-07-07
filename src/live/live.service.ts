import { BadRequestException, Injectable } from '@nestjs/common';
import { ManagerService } from 'src/manager/manager.service';
import { RedisService } from 'src/redis/redis.service';
import { StreamService } from 'src/stream/stream.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class LiveService {
  constructor(
    private readonly streamService: StreamService,
    private readonly redisService: RedisService,
    private readonly userService: UserService,
    private readonly managerService: ManagerService,
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
  async getBroadcasterViewers(userIdx: number, broadcasterId: string) {
    const user = await this.userService.findByUserIdx(userIdx);
    const broadcaster = await this.userService.findByUserId(broadcasterId);
    if (!broadcaster) {
      throw new BadRequestException('존재하지 않는 방송자입니다.');
    }
    // 사용자가 방송자의 매니저인지 확인
    const isManager = await this.managerService.isManager(broadcaster.idx, userIdx);
    if (!isManager && user.idx !== broadcaster.idx) {
      throw new BadRequestException('해당 방송자의 시청자 목록을 조회할 권한이 없습니다.');
    }

    const viewerKey = `viewer:${broadcasterId}`;
    const viewerData = await this.redisService.getHashAll(viewerKey);

    // viewerData를 순회하여 value 값을 객체로 만들어 배열로 변환
    const viewers = Object.entries(viewerData).map(([key, value]) => {
      try {
        // value가 JSON 문자열인 경우 파싱
        return typeof value === 'string' ? JSON.parse(value) : value;
      } catch (error) {
        // JSON 파싱에 실패한 경우 원본 value 반환
        return {
          user_id: key,
          user_idx: -1,
          nickname: 'guest',
          role: 'guest',
        };
      }
    });
    console.log(viewers);
    return viewers;
  }
}
