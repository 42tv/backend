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

  async getPosts(recipient_idx: number) {
    return await this.prisma.posts.findMany({
      where: {
        recipient_idx: recipient_idx,
      },
    });
  }
}
