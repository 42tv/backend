import { Injectable } from '@nestjs/common';
import { Prisma, SanctionStatus, SanctionType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SanctionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: {
      user_idx: number;
      type: SanctionType;
      reason: string;
      expires_at: Date | null;
      admin_idx: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.sanction.create({ data });
  }

  async findById(id: number) {
    return await this.prisma.sanction.findUnique({
      where: { id },
      include: {
        user: {
          select: { idx: true, user_id: true, nickname: true },
        },
      },
    });
  }

  /**
   * 특정 유저의 활성 제재 조회 (만료 시각 지난 건 제외)
   */
  async findActiveByUser(
    userIdx: number,
    type?: SanctionType,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.sanction.findMany({
      where: {
        user_idx: userIdx,
        status: SanctionStatus.ACTIVE,
        ...(type && { type }),
        OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findAll(options: {
    userIdx?: number;
    type?: SanctionType;
    status?: SanctionStatus;
    limit: number;
    offset: number;
  }) {
    const where: Prisma.SanctionWhereInput = {
      ...(options.userIdx && { user_idx: options.userIdx }),
      ...(options.type && { type: options.type }),
      ...(options.status && { status: options.status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.sanction.findMany({
        where,
        include: {
          user: {
            select: { idx: true, user_id: true, nickname: true },
          },
        },
        orderBy: { created_at: 'desc' },
        take: options.limit,
        skip: options.offset,
      }),
      this.prisma.sanction.count({ where }),
    ]);
    return { items, total };
  }

  async release(
    id: number,
    releasedBy: number,
    releaseReason: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.sanction.update({
      where: { id },
      data: {
        status: SanctionStatus.RELEASED,
        released_at: new Date(),
        released_by: releasedBy,
        release_reason: releaseReason,
      },
    });
  }
}
