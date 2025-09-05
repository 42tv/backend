import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ChannelRepository {
  constructor(private readonly prisma: PrismaService) {}

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
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.channel.create({
      data: {
        User: {
          connect: {
            idx: user_idx,
          },
        },
        title: `${user_id} 님의 채널`,
      },
    });
  }

  /**
   * User_idx로 채널을 찾는 함수
   * @param user_idx
   * @returns
   */
  async findChannelByUserIdx(user_idx: number) {
    return await this.prisma.channel.findUnique({
      where: {
        user_idx: user_idx,
      },
      select: {
        title: true,
        bookmark: true,
        recommend: true,
        watch: true,
        month_time: true,
        total_time: true,
      }
    });
  }
}
