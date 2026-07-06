import { Injectable } from '@nestjs/common';
import { Prisma, SanctionStatus, SanctionType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export type AdminUserStatusFilter = 'ACTIVE' | 'SUSPENDED' | 'BROADCAST_BANNED';

const STATUS_SANCTION_TYPE: Record<
  Exclude<AdminUserStatusFilter, 'ACTIVE'>,
  SanctionType
> = {
  SUSPENDED: SanctionType.ACCOUNT_SUSPEND,
  BROADCAST_BANNED: SanctionType.BROADCAST_BAN,
};

function activeSanctionWhere(type?: SanctionType): Prisma.SanctionWhereInput {
  return {
    ...(type && { type }),
    status: SanctionStatus.ACTIVE,
  };
}

@Injectable()
export class AdminUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 관리자용 회원 목록 (검색 + 필터 + 페이징)
   */
  async findAll(options: {
    search?: string;
    provider?: string;
    identityVerified?: boolean;
    adultVerified?: boolean;
    isAdmin?: boolean;
    businessType?: string;
    status?: AdminUserStatusFilter;
    limit: number;
    offset: number;
  }) {
    const where: Prisma.UserWhereInput = {
      ...(options.search && {
        OR: [
          { user_id: { contains: options.search, mode: 'insensitive' } },
          { nickname: { contains: options.search, mode: 'insensitive' } },
          {
            userDetail: {
              email: { contains: options.search, mode: 'insensitive' },
            },
          },
        ],
      }),
      ...(options.provider && { oauth_provider: options.provider }),
      ...(options.identityVerified !== undefined && {
        is_identity_verified: options.identityVerified,
      }),
      ...(options.adultVerified !== undefined && {
        is_adult_verified: options.adultVerified,
      }),
      ...(options.isAdmin !== undefined && { is_admin: options.isAdmin }),
      ...(options.businessType && {
        business_type: options.businessType as any,
      }),
      ...(options.status &&
        (options.status === 'ACTIVE'
          ? { sanctions: { none: activeSanctionWhere() } }
          : {
              sanctions: {
                some: activeSanctionWhere(STATUS_SANCTION_TYPE[options.status]),
              },
            })),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          idx: true,
          user_id: true,
          nickname: true,
          profile_img: true,
          oauth_provider: true,
          is_admin: true,
          is_identity_verified: true,
          identity_verified_at: true,
          is_adult_verified: true,
          business_type: true,
          created_at: true,
          coinBalance: { select: { coin_balance: true } },
          sanctions: {
            where: activeSanctionWhere(),
            select: { id: true, type: true },
          },
        },
        orderBy: { created_at: 'desc' },
        take: options.limit,
        skip: options.offset,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total };
  }

  /**
   * 관리자용 회원 상세
   */
  async findDetail(userIdx: number) {
    const [user, fanCount, followingCount, bookmarkedByCount] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { idx: userIdx },
          include: {
            userDetail: true,
            coinBalance: true,
            channel: true,
            ncpChannel: {
              select: {
                channel_id: true,
                channel_status: true,
                createdAt: true,
              },
            },
            broadcastSetting: true,
            streams: { select: { stream_id: true, start_time: true } },
            UserTerms: {
              include: {
                terms: {
                  select: { id: true, version: true, effectiveDate: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
            policyAgreements: {
              include: {
                policy: { select: { id: true, page: true, title: true } },
              },
              orderBy: { agreed_at: 'desc' },
            },
            sanctions: {
              orderBy: { created_at: 'desc' },
              take: 10,
            },
          },
        }),
        this.prisma.fan.count({ where: { broadcaster_idx: userIdx } }),
        this.prisma.fan.count({ where: { fan_idx: userIdx } }),
        this.prisma.bookmark.count({ where: { bookmarked_idx: userIdx } }),
      ]);

    if (!user) return null;
    return { user, fanCount, followingCount, bookmarkedByCount };
  }

  async updateIsAdmin(userIdx: number, isAdmin: boolean) {
    return await this.prisma.user.update({
      where: { idx: userIdx },
      data: { is_admin: isAdmin },
    });
  }

  /**
   * 오늘 가입자 수 (대시보드용)
   */
  async countSignupsSince(since: Date) {
    return await this.prisma.user.count({
      where: { created_at: { gte: since } },
    });
  }
}
