import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class IvsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * channelArn으로 IvsChannel 찾기
   * @param channelArn
   * @param tx
   * @returns
   */
  async findByArn(channelArn: string, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.iVSChannel.findUnique({
      where: {
        arn: channelArn,
      },
    });
  }
}
