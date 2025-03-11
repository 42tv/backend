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
}
