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
  async createStream(
    user_idx: number,
    thumbnail_url: string,
    request_id: string,
    stream_id: string,
    start_time: string,
    title: string,
    is_adult: boolean,
    is_pw: boolean,
    is_fan: boolean,
    password: string,
    fan_level: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.stream.create({
      data: {
        user: {
          connect: {
            idx: user_idx,
          },
        },
        request_id: request_id,
        thumbnail: thumbnail_url,
        stream_id: stream_id,
        start_time: start_time,
        title: title,
        is_adult: is_adult,
        is_pw: is_pw,
        is_fan: is_fan,
        password: password,
        fan_level: fan_level,
      },
    });
  }

  /**
   * 스트림 삭제
   * @param stream_id
   * @param tx
   * @returns
   */
  async deleteStream(stream_id: string, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.stream.delete({
      where: {
        stream_id: stream_id,
      },
    });
  }

  /**
   * User idx로 스트림 조회
   * @param user_idx
   * @returns
   */
  async getStreamByUserIdx(user_idx: number) {
    return await this.prisma.stream.findFirst({
      where: {
        user_idx: user_idx,
      },
    });
  }

  async getLiveList() {
    const streams = await this.prisma.stream.findMany({
      select: {
        // user_idx: true,
        thumbnail: true,
        // request_id: true,
        // stream_id: true,
        start_time: true,
        title: true,
        is_adult: true,
        is_pw: true,
        is_fan: true,
        fan_level: true,
        play_cnt: true,
        like_cnt: true,
        user: {
          select: {
            idx: true,
            nickname: true,
            profile_img: true,
          },
        },
        _count: {
          select: {
            viewers: true, // Assuming the relation name is 'viewers' in your Prisma schema
          },
        },
      },
    });

    // Map the result to rename _count to viewerCount
    return streams.map((stream) => {
      const { _count, ...rest } = stream;
      return {
        ...rest,
        viewerCount: _count.viewers,
      };
    });
  }
}
