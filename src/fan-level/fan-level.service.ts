import { Injectable } from '@nestjs/common';
import { FanLevelRepository } from './fan-level.repository';
import { Prisma } from '@prisma/client';

@Injectable()
export class FanLevelService {
  constructor(private readonly fanLevelRepository: FanLevelRepository) {}

  async createInitFanLevel(user_idx, tx?: Prisma.TransactionClient) {
    return await this.fanLevelRepository.createInitFanLevel(user_idx, tx);
  }
}
