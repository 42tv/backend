import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ManagerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 매니저 관계 조회
   * @param managerIdx 매니저 사용자 ID
   * @param broadcasterIdx 방송자 사용자 ID
   * @param tx 트랜잭션 클라이언트
   * @returns 매니저 관계 정보
   */
  async findManager(
    broadcasterIdx: number,
    managerIdx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.manager.findFirst({
      where: {
        manager_idx: managerIdx,
        broadcaster_idx: broadcasterIdx,
      },
    });
  }

  /**
   * 매니저 관계 고유 조회 (복합 키)
   * @param broadcasterIdx 방송자 사용자 ID
   * @param managerIdx 매니저 사용자 ID
   * @param tx 트랜잭션 클라이언트
   * @returns 매니저 관계 정보
   */
  async findUniqueManager(
    broadcasterIdx: number,
    managerIdx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.manager.findUnique({
      where: {
        broadcaster_idx_manager_idx: {
          broadcaster_idx: broadcasterIdx,
          manager_idx: managerIdx,
        },
      },
    });
  }

  /**
   * 매니저 관계 생성
   * @param broadcasterIdx 방송자 사용자 ID
   * @param managerIdx 매니저 사용자 ID
   * @param tx 트랜잭션 클라이언트
   * @returns 생성된 매니저 관계 정보
   */
  async createManager(
    broadcasterIdx: number,
    managerIdx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.manager.create({
      data: {
        broadcaster_idx: broadcasterIdx,
        manager_idx: managerIdx,
      },
      include: {
        manager: {
          select: {
            idx: true,
            user_id: true,
            nickname: true,
            profile_img: true,
          },
        },
      },
    });
  }

  /**
   * 매니저 관계 삭제
   * @param broadcasterIdx 방송자 사용자 ID
   * @param managerIdx 매니저 사용자 ID
   * @param tx 트랜잭션 클라이언트
   * @returns 삭제된 매니저 관계 정보
   */
  async deleteManager(
    broadcasterIdx: number,
    managerIdx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.manager.delete({
      where: {
        broadcaster_idx_manager_idx: {
          broadcaster_idx: broadcasterIdx,
          manager_idx: managerIdx,
        },
      },
    });
  }

  /**
   * 사용자 조회 (user_id로)
   * @param userId 사용자 ID
   * @param tx 트랜잭션 클라이언트
   * @returns 사용자 정보
   */
  async findUserByUserId(userId: string, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.user.findUnique({
      where: { user_id: userId },
    });
  }

  /**
   * 사용자 조회 (idx로)
   * @param idx 사용자 인덱스
   * @param tx 트랜잭션 클라이언트
   * @returns 사용자 정보
   */
  async findUserByIdx(idx: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.user.findUnique({
      where: { idx },
    });
  }
}
