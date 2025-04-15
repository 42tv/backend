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

  async deleteStream(stream_id: string, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.stream.delete({
      where: {
        stream_id: stream_id,
      },
    });
  }
}
