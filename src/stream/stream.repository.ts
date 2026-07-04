import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StreamRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Stream 생성 함수
   * @param broadcaster_idx
   * @param tx
   * @returns
   */
  async createStream(
    broadcaster_idx: number,
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
        broadcaster: {
          connect: {
            idx: broadcaster_idx,
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
   * Broadcaster idx로 스트림 조회
   * @param broadcaster_idx
   * @returns
   */
  async getStreamByUserIdx(broadcaster_idx: number) {
    return await this.prisma.stream.findUnique({
      where: {
        broadcaster_idx: broadcaster_idx,
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
        // broadcaster_idx: true,
        thumbnail: true,
        // request_id: true,
        // stream_id: true,
        start_time: true,
        play_cnt: true,
        recommend_cnt: true,
        broadcaster: {
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
                category: true,
              },
            },
          },
        },
      },
    });
    return streams;
  }

  /**
   * 관리자용 라이브 리스트 — 비공개(비밀번호/팬전용) 포함 전체,
   * 미리보기용 playback_url과 방송 설정 전체를 함께 반환
   */
  async getAdminLiveList() {
    return await this.prisma.stream.findMany({
      select: {
        idx: true,
        stream_id: true,
        thumbnail: true,
        start_time: true,
        play_cnt: true,
        recommend_cnt: true,
        broadcaster_idx: true,
        broadcaster: {
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
                category: true,
              },
            },
            ncpChannel: {
              select: {
                channel_id: true,
                playback_url: true,
                channel_status: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * 방송자의 추천 수를 1 증가시킴
   * @param broadcaster_idx 방송자의 user_idx
   * @returns 업데이트된 Stream 객체
   */
  async increaseRecommend(broadcaster_idx: number) {
    return await this.prisma.stream.update({
      where: {
        broadcaster_idx: broadcaster_idx,
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
  async increasePlayCountByBroadcaster(broadcaster_idx: number) {
    return await this.prisma.stream.update({
      where: {
        broadcaster_idx: broadcaster_idx,
      },
      data: {
        play_cnt: {
          increment: 1,
        },
      },
    });
  }

  /**
   * 스트림 ID로 방송의 재생 수를 1 증가시킴
   * @param stream_id 스트림 ID
   * @returns 업데이트된 Stream 객체
   */
  async increasePlayCountByStreamId(stream_id: string) {
    return await this.prisma.stream.update({
      where: {
        stream_id: stream_id,
      },
      data: {
        play_cnt: {
          increment: 1,
        },
      },
    });
  }
}
