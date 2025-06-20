import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FanRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 팬 관계 조회 (특정 팬이 특정 크리에이터의 팬인지 확인)
   * @param fan_idx 팬의 user idx
   * @param creator_idx 크리에이터의 user idx
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 팬 관계 정보 또는 null
   */
  async findFanRelation(
    fan_idx: number,
    creator_idx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.fan.findUnique({
      where: {
        creator_id_fan_idx: {
          creator_id: creator_idx,
          fan_idx: fan_idx,
        },
      },
    });
  }

  /**
   * 팬 관계 생성
   * @param fan_idx 팬의 user idx
   * @param creator_idx 크리에이터의 user idx
   * @param initial_donation 초기 후원 금액 (기본값: 0)
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 생성된 팬 관계
   */
  async createFanRelation(
    fan_idx: number,
    creator_idx: number,
    initial_donation: number = 0,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.fan.create({
      data: {
        fan_idx,
        creator_id: creator_idx,
        total_donation: initial_donation,
      },
    });
  }

  /**
   * 팬의 총 후원 금액 업데이트
   * @param fan_idx 팬의 user idx
   * @param creator_idx 크리에이터의 user idx
   * @param donation_amount 추가할 후원 금액
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 업데이트된 팬 관계
   */
  async updateTotalDonation(
    fan_idx: number,
    creator_idx: number,
    donation_amount: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.fan.update({
      where: {
        creator_id_fan_idx: {
          creator_id: creator_idx,
          fan_idx: fan_idx,
        },
      },
      data: {
        total_donation: {
          increment: donation_amount,
        },
      },
    });
  }

  /**
   * 팬 관계 삭제
   * @param fan_idx 팬의 user idx
   * @param creator_idx 크리에이터의 user idx
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 삭제된 팬 관계
   */
  async deleteFanRelation(
    fan_idx: number,
    creator_idx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.fan.delete({
      where: {
        creator_id_fan_idx: {
          creator_id: creator_idx,
          fan_idx: fan_idx,
        },
      },
    });
  }

  /**
   * 특정 크리에이터의 모든 팬 조회
   * @param creator_idx 크리에이터의 user idx
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 팬 목록
   */
  async findFansByCreator(
    creator_idx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.fan.findMany({
      where: {
        creator_id: creator_idx,
      },
      orderBy: {
        total_donation: 'desc',
      },
    });
  }

  /**
   * 특정 팬이 팔로우하는 모든 크리에이터 조회
   * @param fan_idx 팬의 user idx
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 크리에이터 목록
   */
  async findCreatorsByFan(
    fan_idx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.fan.findMany({
      where: {
        fan_idx: fan_idx,
      },
      orderBy: {
        total_donation: 'desc',
      },
    });
  }
}
