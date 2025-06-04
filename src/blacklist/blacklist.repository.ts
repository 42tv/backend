import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Blacklist } from '@prisma/client';
import { BlacklistWithBlocked } from './types/blacklist.type';

@Injectable()
export class BlacklistRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerIdx: number, blockedIdx: number): Promise<Blacklist> {
    return this.prisma.blacklist.create({
      data: {
        owner_idx: ownerIdx,
        blocked_idx: blockedIdx,
      },
    });
  }

  async findOne(
    ownerIdx: number,
    blockedIdx: number,
  ): Promise<Blacklist | null> {
    return this.prisma.blacklist.findUnique({
      where: {
        owner_idx_blocked_idx: {
          owner_idx: ownerIdx,
          blocked_idx: blockedIdx,
        },
      },
    });
  }

  async findAllByOwner(ownerIdx: number): Promise<BlacklistWithBlocked[]> {
    return this.prisma.blacklist.findMany({
      where: { owner_idx: ownerIdx },
      include: {
        blocked: {
          select: {
            idx: true,
            user_id: true,
            nickname: true,
            profile_img: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    }) as unknown as BlacklistWithBlocked[];
  }

  async delete(ownerIdx: number, blockedIdx: number): Promise<Blacklist> {
    return this.prisma.blacklist.delete({
      where: {
        owner_idx_blocked_idx: {
          owner_idx: ownerIdx,
          blocked_idx: blockedIdx,
        },
      },
    });
  }

  async isBlocked(ownerIdx: number, viewerIdx: number): Promise<boolean> {
    const blacklist = await this.findOne(ownerIdx, viewerIdx);
    return !!blacklist;
  }

  async deleteMany(ownerIdx: number, blockedIdxs: number[]): Promise<number> {
    const result = await this.prisma.blacklist.deleteMany({
      where: {
        owner_idx: ownerIdx,
        blocked_idx: {
          in: blockedIdxs,
        },
      },
    });
    return result.count;
  }
}
