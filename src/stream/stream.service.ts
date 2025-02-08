import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StreamRepository } from './stream.repository';

@Injectable()
export class StreamService {
  constructor(private readonly streamRepository: StreamRepository) {}

  async createStream(channel_idx: number, tx?: Prisma.TransactionClient) {
    return await this.streamRepository.createStream(channel_idx, tx);
  }
}
