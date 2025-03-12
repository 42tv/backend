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
    const sender = await this.userService.findByUserIdx(sender_idx);
    if (!sender) {
      throw new BadRequestException('탈퇴한놈이 쪽지 보내려고하네?');
    }
    const receiver = await this.userService.findByUserId(postDto.userId);
    if (!receiver) {
      throw new BadRequestException('존재하지 않는 유저입니다.');
    }
    return await this.postRepository.createPost(
      sender.idx,
      receiver.idx,
      postDto.message,
    );
  }

  /**
   * recipient_idx의 쪽지를 읽는 함수
   * @param recipient_idx 받는 유저 idx
   * @returns
   */
  async getPosts(recipient_idx: number) {
    console.log(recipient_idx);
    const posts = await this.postRepository.getPosts(recipient_idx);
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
}
