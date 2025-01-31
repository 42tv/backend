import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StreamService {
  constructor(private readonly prisma: PrismaService) {}

  async createStream(channel_idx: number) {
    return await this.prisma.stream.create({
      data: {
        channel_idx: channel_idx,
      },
    });
  }
}
