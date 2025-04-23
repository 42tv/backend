import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BroadcastSettingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * broadcastSetting 생성 (유저 생성에서 호출)
   * @param user_idx
   * @param user_id
   * @param tx
   */
  async createBroadcastSetting(
    user_idx: number,
    user_id: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    await prismaClient.broadCastSetting.create({
      data: {
        User: {
          connect: {
            idx: user_idx,
          },
        },
        title: `${user_id}의 채널입니다`,
      },
    });
  }

  /**
   * 채널 방송 설정 업데이트
   * @param user_idx
   * @param title
   * @param is_adult
   * @param is_pw
   * @param spon_only
   * @param spon_count
   * @param password
   */
  async updateBroadcastSetting(
    user_idx: number,
    title: string,
    is_adult: boolean,
    is_pw: boolean,
    is_fan: boolean,
    fan_level: number,
    password?: string,
  ) {
    return await this.prisma.user.update({
      where: {
        idx: user_idx,
      },
      data: {
        broadcastSetting: {
          update: {
            title: title,
            is_adult: is_adult,
            is_pw: is_pw,
            is_fan: is_fan,
            fan_level: fan_level,
            password: password,
          },
        },
      },
    });
  }

  /**
   * user_idx의 broadcastSetting 가져오기
   * @param user_idx
   * @param tx
   * @returns
   */
  async getBroadcastSetting(user_idx: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.broadCastSetting.findUnique({
      where: {
        user_idx: user_idx,
      },
    });
  }
}
