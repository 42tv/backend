import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IvsService } from 'src/ivs/ivs.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { StreamService } from 'src/stream/stream.service';

@Injectable()
export class ChannelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ivsService: IvsService,
    private readonly streamService: StreamService,
  ) {}

  async createChannel(
    user_idx: number,
    user_id: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.channel.create({
      data: {
        user_idx: user_idx,
        title: `${user_id} 님의 채널`,
      },
    });
  }
}
