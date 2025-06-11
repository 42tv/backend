import { Injectable } from '@nestjs/common';
import { FanLevelService } from 'src/fan-level/fan-level.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FanService {
  constructor(
    private readonly prismaService: PrismaService, // Assuming PrismaService is defined and imported correctly
    private readonly fanLevelService: FanLevelService, // Assuming FanLevelService is defined and imported correctly
  ) {}

  /**
   * 특정 팬이 크리에이터에게 얼마나 후원했는지 확인하여 팬 레벨을 계산하는 함수
   * @param fan_idx 팬의 user idx
   * @param creator_idx 크리에이터의 user idx
   * @returns 현재 팬의 레벨 정보
   */
  async getFanLevel(fan_idx: number, creator_idx: number) {
    // 해당 팬이 크리에이터에게 후원한 총 금액 조회
    const fanRelation = await this.prismaService.fan.findUnique({
      where: {
        creator_id_fan_idx: {
          creator_id: creator_idx,
          fan_idx: fan_idx,
        },
      },
    });

    if (!fanRelation) {
      return null; // 팬이 아님
    }

    // 크리에이터의 팬 레벨 설정 조회
    const fanLevels = await this.fanLevelService.findByUserIdx(creator_idx, 'desc');

    // 팬의 총 후원 금액에 맞는 레벨 찾기
    const totalDonation = fanRelation.total_donation;
    for (const level of fanLevels) {
      if (totalDonation >= level.min_donation) {
        return {
          level: level,
          totalDonation: totalDonation,
        };
      }
    }

    // 어떤 레벨에도 해당하지 않는 경우 (가장 낮은 레벨도 못 채운 경우)
    return {
      level: null,
      totalDonation: totalDonation,
    };
  }

  /**
   * 특정 유저가 다른 유저의 팬인지 확인하는 함수
   * @param fan_idx 팬의 user idx
   * @param creator_idx 크리에이터의 user idx
   * @returns 팬 관계 여부
   */
  async isFan(fan_idx: number, creator_idx: number): Promise<boolean> {
    const fanRelation = await this.prismaService.fan.findUnique({
      where: {
        creator_id_fan_idx: {
          creator_id: creator_idx,
          fan_idx: fan_idx,
        },
      },
    });

    return !!fanRelation;
  }
}
