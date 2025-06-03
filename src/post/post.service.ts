import { BadRequestException, Injectable } from '@nestjs/common';
import { PostRepository } from './post.repository';
import { PostDto } from './dto/create.post.dto';
import { UserService } from 'src/user/user.service';

@Injectable()
export class PostService {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly userService: UserService,
  ) {}

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
    return await this.postRepository.createPost(
      sender_idx,
      receiver.idx,
      postDto.message,
    );
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
      const recipient = await this.userService.findByUserIdx(
        post.recipient_idx,
      );
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
      await this.postRepository.readPosts(recipient_idx, Number(postId));
    } catch (e) {
      throw new BadRequestException('유효하지 않은 요청입니다');
    }
    return;
  }

  /**
   * 쪽지 삭제 함수
   * @param recipient_idx 받는 유저 idx
   * @param postId 삭제할 쪽지 idx
   * @returns
   */
  async deletePost(recipient_idx: number, postId: string) {
    try {
      await this.postRepository.deletePost(recipient_idx, Number(postId));
    } catch (e) {
      throw new BadRequestException('유효하지 않은 요청입니다');
    }
    return;
  }

  /**
   * 쪽지 삭제 함수
   * @param recipient_idx 받는 유저 idx
   * @param postId 삭제할 쪽지 idx
   * @returns
   */
  async deletePosts(recipient_idx: number, postIds: []) {
    try {
      await this.postRepository.deletePosts(recipient_idx, postIds);
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
}
