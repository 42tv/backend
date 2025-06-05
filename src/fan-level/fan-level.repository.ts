import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FanLevelRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 초기 5개 팬레벨 생성
   * @param user_idx
   * @param tx
   * @returns
   */
  async createInitFanLevel(user_idx, tx?: Prisma.TransactionClient) {
    const prismaClient = tx || this.prisma;
    await prismaClient.fanLevel.create({
      data: {
        user: {
          connect: {
            idx: user_idx,
          },
        },
        name: 'Bronze',
        min_donation: 100,
      },
    });
    await prismaClient.fanLevel.create({
      data: {
        user: {
          connect: {
            idx: user_idx,
          },
        },
        name: 'Silver',
        min_donation: 500,
      },
    });
    await prismaClient.fanLevel.create({
      data: {
        user: {
          connect: {
            idx: user_idx,
          },
        },
        name: 'Gold',
        min_donation: 1000,
      },
    });
    await prismaClient.fanLevel.create({
      data: {
        user: {
          connect: {
            idx: user_idx,
          },
        },
        name: 'Platinum',
        min_donation: 3000,
      },
    });
    await prismaClient.fanLevel.create({
      data: {
        user: {
          connect: {
            idx: user_idx,
          },
        },
        name: 'Diamond',
        min_donation: 5000,
      },
    });
    return;
  }

  /**
   * user_idx의 팬레벨 조회
   * @param user_idx
   * @param tx
   * @returns
   */
  async findByUserIdx(user_idx, tx?: Prisma.TransactionClient) {
    const prismaClient = tx || this.prisma;
    return await prismaClient.fanLevel.findMany({
      where: {
        user_idx: user_idx,
      },
      orderBy: {
        min_donation: 'asc',
      },
    });
  }

  /**
   * 사용자의 팬레벨 설정을 업데이트
   * @param user_idx 사용자 인덱스
   * @param levels 레벨별 설정 정보 배열 [{name, min_donation}]
   * @param tx 트랜잭션 클라이언트
   * @returns 업데이트된 팬레벨 정보
   */
  async updateFanLevels(
    user_idx: number,
    levels: { name: string; min_donation: number }[],
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx || this.prisma;

    // 기존 레벨 삭제
    await prismaClient.fanLevel.deleteMany({
      where: {
        user_idx: user_idx,
      },
    });

    // 새 레벨 생성
    const createPromises = levels.map((level) =>
      prismaClient.fanLevel.create({
        data: {
          user: {
            connect: {
              idx: user_idx,
            },
          },
          name: level.name,
          min_donation: level.min_donation,
        },
      }),
    );

    await Promise.all(createPromises);

    // 업데이트된 레벨 반환
    return this.findByUserIdx(user_idx, prismaClient);
  }
}
