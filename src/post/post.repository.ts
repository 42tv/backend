import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PostRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 쪽지 생성
   * @param sender_idx
   * @param receiver_idx
   * @param message
   * @param tx
   * @returns
   */
  async createPost(
    sender_idx: number,
    receiver_idx: number,
    message: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.posts.create({
      data: {
        content: message,
        sender: {
          connect: {
            idx: sender_idx,
          },
        },
        recipient: {
          connect: {
            idx: receiver_idx,
          },
        },
      },
    });
  }

  /**
   * 쪽지 리스트 가져오기
   * @param recipient_idx
   * @returns
   */
  async getPosts(recipient_idx: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.posts.findMany({
      where: {
        recipient_idx: recipient_idx,
      },
      orderBy: {
        sent_at: 'desc',
      },
    });
  }

  /**
   * 쪽지 읽기
   * @param recipient_idx
   * @param postId
   * @param tx
   * @returns
   */
  async readPosts(
    recipient_idx: number,
    postId: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.posts.update({
      where: {
        recipient_idx: recipient_idx,
        id: postId,
      },
      data: {
        is_read: true,
        read_at: new Date(new Date().getTime() + 9 * 60 * 60 * 1000), // Korean time (UTC+9)
      },
    });
  }
}
