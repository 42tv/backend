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
    return await this.prisma.stream.findUnique({
      where: {
        user_idx: user_idx,
      },
    });
  }

  /**
   *
   * @returns 라이브 리스트 리턴
   */
  async getLiveList() {
    const streams = await this.prisma.stream.findMany({
      select: {
        // user_idx: true,
        thumbnail: true,
        // request_id: true,
        // stream_id: true,
        start_time: true,
        play_cnt: true,
        recommend_cnt: true,
        user: {
          select: {
            idx: true,
            user_id: true,
            nickname: true,
            profile_img: true,
            broadcastSetting: {
              select: {
                is_adult: true,
                is_fan: true,
                is_pw: true,
                title: true,
                fan_level: true,
              },
            },
          },
        },
      },
    });
    return streams;
  }

  /**
   * 방송자의 추천 수를 1 증가시킴
   * @param broadcaster_idx 방송자의 user_idx
   * @returns 업데이트된 Stream 객체
   */
  async increaseRecommend(broadcaster_idx: number) {
    return await this.prisma.stream.update({
      where: {
        user_idx: broadcaster_idx,
      },
      data: {
        recommend_cnt: {
          increment: 1,
        },
      },
    });
  }

  /**
   * 방송의 재생 수를 1 증가시킴
   * @param broadcaster_idx 방송자의 user_idx
   * @returns 업데이트된 Stream 객체
   */
  async increasePlayCount(broadcaster_idx: number) {
    return await this.prisma.stream.update({
      where: {
        user_idx: broadcaster_idx,
      },
      data: {
        play_cnt: {
          increment: 1,
        },
      },
    });
  }
}
