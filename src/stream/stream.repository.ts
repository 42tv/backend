import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StreamRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Stream 생성 함수
   * @param user_idx
   * @param tx
   * @returns
   */
  async createStream(user_idx: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.stream.create({
      data: {
        User: {
          connect: {
            idx: user_idx,
          },
        },
      },
    });
  }

  /**
   * user_idx의 Stream 상태를 변경하는 함수
   * @param user_idx
   * @param is_live
   * @param tx
   */
  async changeStreamStatus(
    user_idx: number,
    is_live: boolean,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.stream.update({
      where: {
        user_idx: user_idx,
      },
      data: {
        is_live: is_live,
      },
    });
  }
}
