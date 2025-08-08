import { Injectable, BadRequestException } from '@nestjs/common';
import { FanLevelRepository } from './fan-level.repository';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FanLevelService {
  constructor(
    private readonly fanLevelRepository: FanLevelRepository,
    private readonly prisma: PrismaService,
  ) {}

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
  async findByUserIdx(
    user_idx,
    orderBy: 'asc' | 'desc' = 'desc',
    tx?: Prisma.TransactionClient,
  ) {
    return await this.fanLevelRepository.findByUserIdx(user_idx, orderBy, tx);
  } /**
   * 사용자의 팬레벨 설정을 업데이트 (트랜잭션 내에서 처리)
   * @param user_idx 사용자 인덱스
   * @param levels 레벨별 설정 정보 배열 [{name, min_donation, color?}]
   * @returns 업데이트된 팬레벨 정보
   */
  async updateFanLevels(
    user_idx: number,
    levels: { name: string; min_donation: number; color: string }[],
  ) {
    // 중복된 name, min_donation, color 검사
    const nameSet = new Set();
    const donationSet = new Set();
    const colorSet = new Set();

    for (const level of levels) {
      // 이름 중복 검사
      if (nameSet.has(level.name)) {
        throw new BadRequestException(
          `중복된 팬레벨 이름이 있습니다: ${level.name}`,
        );
      }
      // 기부금액 중복 검사
      if (donationSet.has(level.min_donation)) {
        throw new BadRequestException(
          `중복된 최소 기부금액이 있습니다: ${level.min_donation}`,
        );
      }
      // 색상 중복 검사 (색상이 제공된 경우에만)
      if (level.color && colorSet.has(level.color)) {
        throw new BadRequestException(
          `중복된 팬레벨 색상이 있습니다: ${level.color}`,
        );
      }
      nameSet.add(level.name);
      donationSet.add(level.min_donation);
      if (level.color) {
        colorSet.add(level.color);
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      return this.fanLevelRepository.updateFanLevels(user_idx, levels, tx);
    });
  }
}
