import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FanLevelRepository {
  constructor(private readonly prisma: PrismaService) {}

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
}
