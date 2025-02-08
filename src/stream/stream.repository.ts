import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export class StreamRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createStream(channel_idx: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.stream.create({
      data: {
        Channel: {
          connect: {
            idx: channel_idx,
          },
        },
      },
    });
  }
}
