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

    const [items, total] = await this.prisma.$transaction([
      this.prisma.donation.findMany({
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
      }),
      this.prisma.donation.count({ where }),
    ]);

    return { items, total };
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

    const [items, total] = await this.prisma.$transaction([
      this.prisma.donation.findMany({
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
      }),
      this.prisma.donation.count({ where }),
    ]);

    return { items, total };
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
   * 기간별 후원 추이 조회 (차트용 시계열 데이터)
   * @param streamerIdx 스트리머 인덱스
   * @param options 기간 및 단위 옵션
   * @returns 기간별 집계 데이터
   */
  async getDonationTrend(
    streamerIdx: number,
    options: {
      startDate: Date;
      endDate: Date;
      unit: 'day' | 'week' | 'month';
    },
  ) {
    const rows = await this.prisma.$queryRaw<
      {
        period: Date;
        total_coin_amount: bigint;
        total_coin_value: bigint;
        donation_count: bigint;
      }[]
    >`
      SELECT
        date_trunc(${options.unit}, donated_at) AS period,
        SUM(coin_amount)::bigint AS total_coin_amount,
        SUM(coin_value)::bigint  AS total_coin_value,
        COUNT(*)::bigint         AS donation_count
      FROM donations
      WHERE streamer_idx = ${streamerIdx}
        AND donated_at >= ${options.startDate}
        AND donated_at <= ${options.endDate}
        AND donor_deleted_at IS NULL
        AND streamer_deleted_at IS NULL
      GROUP BY period
      ORDER BY period ASC
    `;

    return rows.map((r) => ({
      period: formatPeriod(r.period, options.unit),
      total_coin_amount: Number(r.total_coin_amount),
      total_coin_value: Number(r.total_coin_value),
      donation_count: Number(r.donation_count),
    }));
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

function formatPeriod(date: Date, unit: 'day' | 'week' | 'month'): string {
  if (unit === 'month') return date.toISOString().slice(0, 7);
  if (unit === 'week') {
    const d = new Date(date);
    const dayOfWeek = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(
      (((d as any) - (yearStart as any)) / 86400000 + 1) / 7,
    );
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }
  return date.toISOString().slice(0, 10);
}
