import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FanRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 팬 관계 조회 (특정 팬이 특정 방송인의 팬인지 확인)
   * @param fan_idx 팬의 user idx
   * @param broadcaster_idx 방송인의 user idx
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 팬 관계 정보 또는 null
   */
  async findFan(
    fan_idx: number,
    broadcaster_idx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.fan.findUnique({
      where: {
        broadcaster_idx_fan_idx: {
          broadcaster_idx: broadcaster_idx,
          fan_idx: fan_idx,
        },
      },
      include: {
        current_level: true, // 현재 레벨 정보 포함
      },
    });
  }

  /**
   * 팬 관계 생성 (레벨에 도달해야만 생성 가능)
   * @param fan_idx 팬의 user idx
   * @param broadcaster_idx 방송인의 user idx
   * @param initial_donation 초기 후원 금액
   * @param level_id 현재 팬 레벨 ID (필수)
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 생성된 팬 관계
   */
  async createFanRelation(
    fan_idx: number,
    broadcaster_idx: number,
    initial_donation: number,
    level_id: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.fan.create({
      data: {
        fan_idx,
        broadcaster_idx: broadcaster_idx,
        total_donation: initial_donation,
        current_level_id: level_id,
      },
    });
  }

  /**
   * 팬의 총 후원 금액 업데이트
   * @param fan_idx 팬의 user idx
   * @param broadcaster_idx 방송인의 user idx
   * @param donation_amount 추가할 후원 금액
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 업데이트된 팬 관계
   */
  async updateTotalDonation(
    fan_idx: number,
    broadcaster_idx: number,
    donation_amount: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.fan.update({
      where: {
        broadcaster_idx_fan_idx: {
          broadcaster_idx: broadcaster_idx,
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
   * 팬의 총 후원 금액과 레벨 함께 업데이트
   * @param fan_idx 팬의 user idx
   * @param broadcaster_idx 방송인의 user idx
   * @param donation_amount 추가할 후원 금액
   * @param level_id 새로운 레벨 ID
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 업데이트된 팬 관계
   */
  async updateTotalDonationAndLevel(
    fan_idx: number,
    broadcaster_idx: number,
    donation_amount: number,
    level_id: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.fan.update({
      where: {
        broadcaster_idx_fan_idx: {
          broadcaster_idx: broadcaster_idx,
          fan_idx: fan_idx,
        },
      },
      data: {
        total_donation: {
          increment: donation_amount,
        },
        current_level_id: level_id,
      },
    });
  }

  /**
   * 팬 관계 삭제
   * @param fan_idx 팬의 user idx
   * @param broadcaster_idx 방송인의 user idx
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 삭제된 팬 관계
   */
  async deleteFanRelation(
    fan_idx: number,
    broadcaster_idx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.fan.delete({
      where: {
        broadcaster_idx_fan_idx: {
          broadcaster_idx: broadcaster_idx,
          fan_idx: fan_idx,
        },
      },
    });
  }

  /**
   * 특정 방송인의 모든 팬 조회
   * @param broadcaster_idx 방송인의 user idx
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 팬 목록
   */
  async findFansByBroadcaster(
    broadcaster_idx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.fan.findMany({
      where: {
        broadcaster_idx: broadcaster_idx,
      },
      orderBy: {
        total_donation: 'desc',
      },
    });
  }

  /**
   * 특정 팬이 팔로우하는 모든 방송인 조회
   * @param fan_idx 팬의 user idx
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 방송인 목록
   */
  async findBroadcastersByFan(fan_idx: number, tx?: Prisma.TransactionClient) {
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

  /**
   * 팬의 현재 레벨 업데이트 (캐시)
   * @param fan_idx 팬의 user idx
   * @param broadcaster_idx 방송인의 user idx
   * @param level_id 새로운 레벨 ID
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 업데이트된 팬 관계
   */
  async updateCurrentLevel(
    fan_idx: number,
    broadcaster_idx: number,
    level_id: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.fan.update({
      where: {
        broadcaster_idx_fan_idx: {
          broadcaster_idx: broadcaster_idx,
          fan_idx: fan_idx,
        },
      },
      data: {
        current_level_id: level_id,
      },
      include: {
        current_level: true, // 업데이트된 레벨 정보 포함
      },
    });
  }
}
