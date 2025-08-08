import {
  BadRequestException,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PostRepository } from './post.repository';
import { PostDto } from './dto/create.post.dto';
import { UserService } from 'src/user/user.service';
import { FanService } from 'src/fan/fan.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { FanLevelService } from 'src/fan-level/fan-level.service';

@Injectable()
export class PostService {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly userService: UserService,
    private readonly fanService: FanService,
    private readonly fanLevelService: FanLevelService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * 유저 생성 시 PostSettings 초기화 함수
   * @param user_idx 유저 인덱스
   * @param tx 트랜잭션 옵션
   * @returns
   */
  async createPostSettings(user_idx: number, tx?: any) {
    const prismaClient = tx ?? this.prismaService;
    return await prismaClient.postSettings.create({
      data: {
        user_idx: user_idx,
        min_fan_level_id: null,
      },
    });
  }

  /**
   * 쪽지 보내는 함수
   * @param sender_idx 보내는 유저 idx
   * @param postDto message, userId
   * @returns
   */
  async createPost(sender_idx: number, postDto: PostDto) {
    // MemberGuard에서 이미 유저 존재 여부를 검증했으므로 sender 검사 불필요
    const receiver = await this.userService.findByUserId(postDto.userId);
    if (!receiver) {
      throw new BadRequestException('존재하지 않는 유저입니다.');
    }

    // 자기 자신에게 쪽지 보내기 방지
    // if (sender_idx === receiver.idx) {
    //   throw new BadRequestException('자기 자신에게는 쪽지를 보낼 수 없습니다.');
    // }

    // 받는 사람의 쪽지 설정 확인
    const postSettings = await this.prismaService.postSettings.findUnique({
      where: { user_idx: receiver.idx },
      include: {
        minFanLevel: true, // 최소 팬레벨 정보도 함께 조회
      },
    });

    if (!postSettings) {
      throw new BadRequestException(
        '받는 사람의 쪽지 설정을 찾을 수 없습니다.',
      );
    }

    // 쪽지 설정이 있고 팬 전용 설정이 켜져 있는 경우
    if (postSettings.min_fan_level_id) {
      // 팬인지 확인
      const fan = await this.fanService.findFan(sender_idx, receiver.idx);
      if (!fan) {
        throw new ForbiddenException(
          `${receiver.nickname}님의 쪽지 수신은 "${postSettings.minFanLevel.name}" 레벨 이상이어야 합니다`,
        );
      }

      // 최소 팬레벨이 설정되어 있는 경우
      if (postSettings.min_fan_level_id && postSettings.minFanLevel) {
        // 팬 레벨 확인
        if (fan.total_donation < postSettings.minFanLevel.min_donation) {
          throw new ForbiddenException(
            `쪽지를 보내기 위해서는 최소 "${postSettings.minFanLevel.name}" 레벨 이상이어야 합니다.`,
          );
        }
      }
    }

    return await this.prismaService.$transaction(async (tx) => {
      return await this.postRepository.createPost(
        sender_idx,
        receiver.idx,
        postDto.message,
        tx,
      );
    });
  }

  /**
   * recipient_idx의 쪽지를 읽는 함수
   * @param recipient_idx 받는 유저 idx
   * @returns
   */
  async getPosts(recipient_idx: number, kind: string, nickname: string) {
    let posts;
    if (kind == 'receive') {
      if (nickname) {
        posts = await this.postRepository.getReceivePostsByNickname(
          recipient_idx,
          nickname,
        );
      } else {
        posts = await this.postRepository.getPosts(recipient_idx);
      }
    } else if (kind == 'send') {
      if (nickname) {
        posts = await this.postRepository.getSendPostsByNickname(
          recipient_idx,
          nickname,
        );
      } else {
        posts = await this.postRepository.getSendPosts(recipient_idx);
      }
    } else {
      throw new BadRequestException('유효하지 않은 요청입니다');
    }

    const result = [];
    for (const post of posts) {
      const sender = await this.userService.findByUserIdx(post.sender_idx);
      const recipient = await this.userService.findByUserIdx(post.receiver_idx);
      result.push({
        id: post.id,
        message: post.content,
        is_read: post.is_read,
        sender: {
          idx: sender.idx,
          userId: sender.user_id,
          nickname: sender.nickname,
        },
        recipient: {
          idx: recipient.idx,
          userId: recipient.user_id,
          nickname: recipient.nickname,
        },
        sentAt: post.sent_at,
        readAt: post.read_at ? true : false,
      });
    }
    return result;
  }

  /**
   * 쪽지 읽는 함수
   * @param recipient_idx 받은 유저 idx
   * @param postId 읽을 쪽지 idx
   * @returns
   */
  async readPosts(recipient_idx: number, postId: string) {
    try {
      await this.prismaService.$transaction(async (tx) => {
        await this.postRepository.readPosts(recipient_idx, Number(postId), tx);
      });
    } catch (e) {
      throw new BadRequestException('유효하지 않은 요청입니다');
    }
    return;
  }

  /**
   * 받은 쪽지 삭제 함수
   * @param recipient_idx 받는 유저 idx
   * @param postId 삭제할 쪽지 idx
   * @returns
   */
  async deleteReceivedPost(recipient_idx: number, postId: string) {
    try {
      await this.prismaService.$transaction(async (tx) => {
        await this.postRepository.deleteReceivedPost(
          recipient_idx,
          Number(postId),
          tx,
        );
      });
    } catch (e) {
      throw new BadRequestException('유효하지 않은 요청입니다');
    }
    return;
  }

  /**
   * 보낸 쪽지 삭제 함수
   * @param sender_idx 보낸 유저 idx
   * @param postId 삭제할 쪽지 idx
   * @returns
   */
  async deleteSentPost(sender_idx: number, postId: string) {
    try {
      await this.prismaService.$transaction(async (tx) => {
        await this.postRepository.deleteSentPost(
          sender_idx,
          Number(postId),
          tx,
        );
      });
    } catch (e) {
      throw new BadRequestException('유효하지 않은 요청입니다');
    }
    return;
  }

  /**
   * 받은 쪽지 여러개 삭제 함수
   * @param recipient_idx 받는 유저 idx
   * @param postIds 삭제할 쪽지 idx 배열
   * @returns
   */
  async deleteReceivedPosts(recipient_idx: number, postIds: number[]) {
    try {
      await this.prismaService.$transaction(async (tx) => {
        await this.postRepository.deleteReceivedPosts(
          recipient_idx,
          postIds,
          tx,
        );
      });
    } catch (e) {
      throw new BadRequestException('유효하지 않은 요청입니다');
    }
    return;
  }

  /**
   * 보낸 쪽지 여러개 삭제 함수
   * @param sender_idx 보낸 유저 idx
   * @param postIds 삭제할 쪽지 idx 배열
   * @returns
   */
  async deleteSentPosts(sender_idx: number, postIds: number[]) {
    try {
      await this.prismaService.$transaction(async (tx) => {
        await this.postRepository.deleteSentPosts(sender_idx, postIds, tx);
      });
    } catch (e) {
      throw new BadRequestException('유효하지 않은 요청입니다');
    }
    return;
  }

  /**
   * 차단한 유저를 확인하는 함수
   * @param blocker_idx
   * @returns
   */
  async getBlockedPostUser(blocker_idx: number) {
    const blockcedUsers =
      await this.postRepository.getBlockedPostUser(blocker_idx);
    return blockcedUsers;
  }

  /**
   * blocker가 blocked유저의 쪽지를 차단
   * @param blocker_idx
   * @param blocked_idx
   * @returns
   */
  async blockUser(blocker_idx: number, blocked_idx: number) {
    if (isNaN(blocked_idx)) {
      throw new BadRequestException('유효하지 않은 요청입니다');
    }
    blocked_idx = Number(blocked_idx);
    const blockedUser = await this.postRepository.findBlockUser(
      blocker_idx,
      blocked_idx,
    );
    if (blockedUser) {
      throw new BadRequestException('이미 차단한 유저입니다');
    }
    await this.postRepository.blockUser(blocker_idx, blocked_idx);
    return;
  }

  /**
   * 차단 해제 함수
   * @param blocker_idx
   * @param blocked_idx
   * @returns
   */
  async unblockUser(blocker_idx: number, blocked_idx: number) {
    if (isNaN(blocked_idx)) {
      throw new BadRequestException('유효하지 않은 요청입니다');
    }
    blocked_idx = Number(blocked_idx);
    console.log(blocker_idx, blocked_idx);
    try {
      await this.postRepository.unblockUser(blocker_idx, blocked_idx);
    } catch (e) {
      throw new BadRequestException('유효하지 않은 요청입니다');
    }
    return;
  }

  /**
   * 다수 차단 해제 함수
   * @param blocker_idx
   * @param blockedUserIdxs
   * @returns
   */
  async unblockUsers(blocker_idx: number, blockedUserIdxs: []) {
    for (const blockedUserIdx of blockedUserIdxs) {
      try {
        await this.unblockUser(blocker_idx, blockedUserIdx);
      } catch (e) {}
    }
    return;
  }

  /**
   * 쪽지 설정 조회 함수
   * @param user_idx 유저 인덱스
   * @returns
   */
  async getPostSettings(user_idx: number) {
    const postSettings = await this.prismaService.postSettings.findUnique({
      where: { user_idx },
      include: {
        minFanLevel: true,
      },
    });
    if (!postSettings) {
      throw new BadRequestException('쪽지 설정을 찾을 수 없습니다.');
    }

    const fanLevels = await this.fanLevelService.findByUserIdx(user_idx);
    console.log('fanLevels', fanLevels);
    console.log(`postSetting`, postSettings);

    // minFanLevel이 팬레벨 배열에서 몇 번째로 높은 레벨인지 계산
    let minFanLevelRank = null;
    console.log(postSettings.minFanLevel);
    if (postSettings.minFanLevel) {
      // fanLevels는 min_donation 오름차순으로 정렬되어 있으므로
      // 배열에서 해당 레벨의 인덱스를 찾아서 순위를 계산
      const levelIndex = fanLevels.findIndex(
        (level) => level.id === postSettings.minFanLevel.id,
      );
      if (levelIndex != -1) {
        minFanLevelRank = levelIndex + 1;
      }
    }
    console.log(`minFanLevelRank`, minFanLevelRank);

    return {
      fanLevels: fanLevels,
      minFanLevel: minFanLevelRank,
    };
  }

  /**
   * 쪽지 설정 업데이트 함수
   * @param user_idx 유저 인덱스
   * @param updateData 업데이트할 데이터
   * @returns
   */
  async updatePostSettings(user_idx: number, min_fan_level_rank?: number) {
    let min_fan_level_id: number | null = null;

    // 팬레벨 순위가 제공된 경우, 해당 순위의 팬레벨을 찾아 ID 설정
    if (min_fan_level_rank !== null && min_fan_level_rank !== undefined) {
      // 사용자의 팬레벨 목록을 min_donation 오름차순으로 조회
      const fanLevels = await this.fanLevelService.findByUserIdx(user_idx);
      if (fanLevels.length === 0) {
        throw new BadRequestException('팬레벨이 설정되지 않았습니다.');
      }

      // 순위가 1~5 범위를 벗어나거나 존재하지 않는 경우
      if (min_fan_level_rank < 1 || min_fan_level_rank > fanLevels.length) {
        throw new BadRequestException(
          `유효하지 않은 팬레벨 순위입니다. 1~${fanLevels.length} 범위 내에서 선택해주세요.`,
        );
      }

      // 순위는 1부터 시작하므로 배열 인덱스로 변환 (1 -> 0, 2 -> 1, ...)
      min_fan_level_id = fanLevels[min_fan_level_rank - 1].id;
    }
    await this.prismaService.postSettings.update({
      where: { user_idx },
      data: {
        min_fan_level_id: min_fan_level_id,
      },
    });

    return {
      message: '수신제한 설정이 업데이트되었습니다',
    };
  }
}
