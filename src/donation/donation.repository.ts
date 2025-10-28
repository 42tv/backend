import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DonationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Donation 생성
   * @param data Donation 생성 데이터
   * @param tx 트랜잭션 클라이언트 (선택)
   * @returns 생성된 Donation
   */
  async create(
    data: Prisma.DonationCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.donation.create({
      data,
      include: {
        donor: {
          select: {
            idx: true,
            nickname: true,
            user_id: true,
          },
        },
        streamer: {
          select: {
            idx: true,
            nickname: true,
            user_id: true,
          },
        },
      },
    });
  }

  /**
   * ID로 Donation 조회
   * @param id Donation ID
   * @returns Donation 또는 null
   */
  async findById(id: string) {
    return await this.prisma.donation.findUnique({
      where: { id },
      include: {
        donor: {
          select: {
            idx: true,
            nickname: true,
            user_id: true,
            profile_img: true,
          },
        },
        streamer: {
          select: {
            idx: true,
            nickname: true,
            user_id: true,
            profile_img: true,
          },
        },
        usages: {
          include: {
            topup: true,
          },
        },
        payoutCoins: true,
      },
    });
  }

  /**
   * 스트리머가 받은 후원 목록 조회
   * @param streamerIdx 스트리머 인덱스
   * @param options 필터 옵션
   * @returns Donation 목록
   */
  async findReceivedByStreamerIdx(
    streamerIdx: number,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: Prisma.DonationWhereInput = {
      streamer_idx: streamerIdx,
    };

    if (options?.startDate || options?.endDate) {
      where.donated_at = {};
      if (options.startDate) {
        where.donated_at.gte = options.startDate;
      }
      if (options.endDate) {
        where.donated_at.lte = options.endDate;
      }
    }

    return await this.prisma.donation.findMany({
      where,
      include: {
        donor: {
          select: {
            idx: true,
            nickname: true,
            user_id: true,
            profile_img: true,
          },
        },
      },
      orderBy: {
        donated_at: 'desc',
      },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  /**
   * 사용자가 보낸 후원 목록 조회
   * @param donorIdx 후원자 인덱스
   * @param options 필터 옵션
   * @returns Donation 목록
   */
  async findSentByDonorIdx(
    donorIdx: number,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: Prisma.DonationWhereInput = {
      donor_idx: donorIdx,
    };

    if (options?.startDate || options?.endDate) {
      where.donated_at = {};
      if (options.startDate) {
        where.donated_at.gte = options.startDate;
      }
      if (options.endDate) {
        where.donated_at.lte = options.endDate;
      }
    }

    return await this.prisma.donation.findMany({
      where,
      include: {
        streamer: {
          select: {
            idx: true,
            nickname: true,
            user_id: true,
            profile_img: true,
          },
        },
      },
      orderBy: {
        donated_at: 'desc',
      },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  /**
   * 스트리머의 후원 통계 조회
   * @param streamerIdx 스트리머 인덱스
   * @param options 기간 옵션
   * @returns 후원 통계
   */
  async getReceivedStats(
    streamerIdx: number,
    options?: {
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const where: Prisma.DonationWhereInput = {
      streamer_idx: streamerIdx,
    };

    if (options?.startDate || options?.endDate) {
      where.donated_at = {};
      if (options.startDate) {
        where.donated_at.gte = options.startDate;
      }
      if (options.endDate) {
        where.donated_at.lte = options.endDate;
      }
    }

    const result = await this.prisma.donation.aggregate({
      where,
      _sum: {
        coin_amount: true,
        coin_value: true,
      },
      _count: true,
      _avg: {
        coin_amount: true,
      },
    });

    return {
      total_coin_amount: result._sum.coin_amount || 0,
      total_coin_value: result._sum.coin_value || 0,
      donation_count: result._count,
      average_coin_amount: result._avg.coin_amount || 0,
    };
  }

  /**
   * 후원자별 통계 조회
   * @param streamerIdx 스트리머 인덱스
   * @param options 옵션
   * @returns 후원자별 통계
   */
  async getTopDonors(
    streamerIdx: number,
    options?: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const where: Prisma.DonationWhereInput = {
      streamer_idx: streamerIdx,
      donor_idx: {
        not: null,
      },
    };

    if (options?.startDate || options?.endDate) {
      where.donated_at = {};
      if (options.startDate) {
        where.donated_at.gte = options.startDate;
      }
      if (options.endDate) {
        where.donated_at.lte = options.endDate;
      }
    }

    const result = await this.prisma.donation.groupBy({
      by: ['donor_idx'],
      where,
      _sum: {
        coin_amount: true,
        coin_value: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          coin_value: 'desc',
        },
      },
      take: options?.limit || 10,
    });

    // donor 정보 추가
    const donorIndices = result
      .map((r) => r.donor_idx)
      .filter((idx) => idx !== null);
    const donors = await this.prisma.user.findMany({
      where: {
        idx: {
          in: donorIndices,
        },
      },
      select: {
        idx: true,
        nickname: true,
        user_id: true,
        profile_img: true,
      },
    });

    const donorMap = new Map(donors.map((d) => [d.idx, d]));

    return result.map((r) => ({
      donor: donorMap.get(r.donor_idx),
      total_coin_amount: r._sum.coin_amount || 0,
      total_coin_value: r._sum.coin_value || 0,
      donation_count: r._count,
    }));
  }
}
