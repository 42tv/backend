import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IvsService } from 'src/ivs/ivs.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { StreamService } from 'src/stream/stream.service';
import { ChannelRepository } from './channel.repository';

@Injectable()
export class ChannelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ivsService: IvsService,
    private readonly streamService: StreamService,
    private readonly channelRepository: ChannelRepository,
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
    return await this.channelRepository.createChannel(user_idx, user_id, tx);
  }

  /**
   * User_idx로 채널을 찾는 함수
   * @param user_idx
   * @returns
   */
  async findChannelByUserIdx(user_idx: number) {
    return await this.channelRepository.findChannelByUserIdx(user_idx);
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
      console.log(err);
      await this.ivsService.deleteChannel(ivs.arn);
      throw err;
    }
  }
}
