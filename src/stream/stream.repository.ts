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
        title: title,
        is_adult: is_adult,
        is_pw: is_pw,
        is_fan: is_fan,
        password: password,
        fan_level: fan_level,
      },
    });
  }

  async deleteStream(user_idx: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.stream.delete({
      where: {
        user_idx: user_idx,
      },
    });
  }
}
