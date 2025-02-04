import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StreamService {
  constructor(private readonly prisma: PrismaService) {}

  async createStream(channel_idx: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.stream.create({
      data: {
        Channel: {
          connect: {
            idx: channel_idx,
          },
        },
        play_cnt: 0,
        like_cnt: 0,
        thumbnail: '', // 기본값 설정
        is_adult: false,
        is_live: false,
        is_pw: false,
      },
    });
  }
}
