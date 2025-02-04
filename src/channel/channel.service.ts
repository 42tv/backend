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
        user_idx: user_idx,
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
    return await this.prisma.channel.findFirst({
      where: {
        user_idx: user_idx,
      },
    });
  }

  /**
   * User가 본인인증에 성공하면 Stream과 Ivs를 생성해서 연결해줌
   * @param channel_idx
   */
  async verifyPhone(user_idx: number) {
    const channel = await this.findChannelByUserIdx(user_idx);
    let ivs;
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.streamService.createStream(channel.idx, tx);
        await this.ivsService.createChannel(channel.idx, channel.title, tx);
      });
    } catch (err) {
      await this.ivsService.deleteChannel(ivs.arn);
      throw err;
    }
  }
}
