import { Injectable } from '@nestjs/common';
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
}
