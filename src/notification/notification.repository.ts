import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 받은 쪽지 중 미읽음 개수
   */
  async countUnreadPosts(receiverIdx: number): Promise<number> {
    return await this.prisma.posts.count({
      where: {
        receiver_idx: receiverIdx,
        receiver_deleted: false,
        is_read: false,
      },
    });
  }
}
