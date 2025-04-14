import { Injectable } from '@nestjs/common';
import { FanLevelRepository } from './fan-level.repository';
import { Prisma } from '@prisma/client';

@Injectable()
export class FanLevelService {
  constructor(private readonly fanLevelRepository: FanLevelRepository) {}

  /**
   * 유저 생성 될 때 5개의 팬레벨을 생성하는 함수
   * @param user_idx
   * @param tx
   * @returns
   */
  async createInitFanLevel(user_idx, tx?: Prisma.TransactionClient) {
    return await this.fanLevelRepository.createInitFanLevel(user_idx, tx);
  }

  /**
   * user_idx의 팬레벨 조회
   * @param user_idx
   * @param tx
   * @returns
   */
  async findByUserIdx(user_idx, tx?: Prisma.TransactionClient) {
    return await this.fanLevelRepository.findByUserIdx(user_idx, tx);
  }
}
