import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export class StreamRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createStream(user_idx: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.stream.create({
      data: {
        User: {
          connect: {
            idx: user_idx,
          },
        },
      },
    });
  }
}
