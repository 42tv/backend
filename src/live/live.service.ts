import { BadRequestException, Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { StreamService } from 'src/stream/stream.service';

@Injectable()
export class LiveService {
  constructor(
    private readonly streamService: StreamService,
    private readonly redisService: RedisService,
  ) {}

  async getLiveList() {
    const lives = await this.streamService.getLiveList();
    
    // Promise.all을 사용하여 모든 비동기 작업이 완료될 때까지 기다립니다
    const livesWithViewerCount = await Promise.all(
      lives.map(async (live) => {
        // Redis에서 시청자 수 조회
        const viewerCount = await this.redisService.getHashFieldCount(`viewer:${live.user.user_id}`);
        // 기존 live 객체에 viewerCount 속성 추가
        return {
          ...live,
          viewerCount: viewerCount || 0, // 시청자가 없는 경우 0으로 설정
        };
      })
    );
    
    return livesWithViewerCount;
  }

  /**
   * 방송자의 좋아요 수를 1 증가시킴 (하루 1회 제한)
   * @param viewer_idx 시청자의 user_idx
   * @param broadcaster_idx 방송자의 user_idx
   * @returns 업데이트된 Stream 객체
   */
  async likeLiveStream(viewer_idx: number, broadcaster_idx: number) {
    // 한국 시간 기준 오늘 날짜 생성 (YYYY-MM-DD 형식)
    const kstDate = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    const today = kstDate.toISOString().split('T')[0];
    
    // 이미 좋아요를 했는지 확인
    const alreadyLiked = await this.redisService.checkDailyLike(viewer_idx, broadcaster_idx, today);
    if (alreadyLiked) {
      throw new BadRequestException('오늘 이미 추천하셨습니다.');
    }
    
    // 좋아요 기록 저장
    await this.redisService.recordDailyLike(viewer_idx, broadcaster_idx, today);
    
    // 좋아요 수 증가
    return await this.streamService.increaseLike(broadcaster_idx);
  }
}
