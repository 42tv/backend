import {
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ChannelRepository } from './channel.repository';
import { UserService } from 'src/user/user.service';
import { ArticleService } from 'src/article/article.service';
import { FanLevelService } from 'src/fan-level/fan-level.service';
import { GetChannelResponseDto } from './dto/channel-response.dto';

@Injectable()
export class ChannelService {
  constructor(
    private readonly channelRepository: ChannelRepository,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => ArticleService))
    private readonly articleService: ArticleService,
    private readonly fanLevelService: FanLevelService,
  ) {}

  /**
   * 채널 생성 함수
   * @param user_idx
   * @param user_id
   * @param tx 트랜잭션 옵션
   * @returns
   */
  async createChannel(
    user_idx: number,
    user_id: string,
    tx?: Prisma.TransactionClient,
  ) {
    return await this.channelRepository.createChannel(user_idx, user_id, tx);
  }

  /**
   * User_idx로 채널을 찾는 함수
   * @param user_idx
   * @returns
   */
  async findChannelByUserIdx(user_idx: number) {
    return await this.channelRepository.findChannelByUserIdx(user_idx);
  }

  /**
   * User가 본인인증에 성공하면 Stream과 Ivs를 생성해서 연결해줌
   * @param channel_idx
   */
  async verifyPhone(user_idx: number) {
    console.log(user_idx);
  }

  /**
   * 채널 정보 조회 (사용자 정보, 게시글, 팬레벨)
   * @param user_id 사용자 ID
   * @returns 채널 정보
   */
  async getChannelInfo(user_id: string): Promise<GetChannelResponseDto> {
    const user = await this.userService.findByUserId(user_id);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const [articles, fanLevel, channel] = await Promise.all([
      this.getArticlesByUserId(user_id),
      this.fanLevelService.findByUserIdx(user.idx),
      this.findChannelByUserIdx(user.idx),
    ]);

    return {
      user: {
        userIdx: user.idx,
        userId: user.user_id,
        nickname: user.nickname,
        profileImg: user.profile_img,
      },
      channel: channel || null,
      articles: articles,
      fanLevel: fanLevel || [],
    };
  }

  private async getArticlesByUserId(user_id: string) {
    try {
      return await this.articleService.getArticlesWithPagination(
        user_id,
        1,
        0,
        5,
      );
    } catch (error) {
      return {
        data: [],
        pagination: {
          total: 0,
          currentPage: 1,
          totalPages: 0,
          limit: 5,
          offset: 0,
          hasNext: false,
          hasPrev: false,
          nextOffset: null,
          prevOffset: null,
        },
      };
    }
  }
}
