import { Injectable } from '@nestjs/common';
import { FanLevelService } from 'src/fan-level/fan-level.service';
import { FanRepository } from './fan.repository';
import { ManagerService } from 'src/manager/manager.service';

@Injectable()
export class FanService {
  constructor(
    private readonly fanRepository: FanRepository,
    private readonly fanLevelService: FanLevelService,
    private readonly managerService: ManagerService,
  ) {}

  /**
   * 특정 팬이 크리에이터에게 얼마나 후원했는지 확인하여 팬 레벨을 계산하는 함수
   * 매니저인 경우 'manager' 레벨을 반환
   * @param fan_idx 팬의 user idx
   * @param creator_idx 크리에이터의 user idx
   * @returns 현재 팬의 레벨 정보 또는 매니저 정보
   */
  async getFanLevel(fanIdx: number, broadcasterIdx: number) {

    // 매니저, 팬 확인
    const fanRelation = await this.fanRepository.findFan(fanIdx, broadcasterIdx);
    const isManager = await this.managerService.isManager(fanIdx, broadcasterIdx);

    if (!fanRelation && !isManager) {
      return {
        level: {
          name: 'viewer',
          color: '#6B7280', // 기본 팬 레벨 색상
        },
        totalDonation: 0,
      }
    }

    // 크리에이터의 팬 레벨 설정 조회
    const fanLevels = await this.fanLevelService.findByUserIdx(broadcasterIdx, 'desc');

    // 매니저인 경우 매니저 레벨 반환
    if (isManager) {
      return {
        level: {
          name: 'manager',
          color: '#3EB350', // 매니저 전용 색상
        },
        totalDonation: fanRelation ? fanRelation.total_donation : 0,
        isManager: true,
      };
    }

    // 팬의 총 후원 금액에 맞는 레벨 찾기
    const totalDonation = fanRelation.total_donation;
    for (const level of fanLevels) {
      if (totalDonation >= level.min_donation) {
        return {
          level: {
            name: level.name,
            color: level.color,
          },
          totalDonation: totalDonation,
        };
      }
    }
  }

  /**
   * 팬이 크리에이터에게 후원한 총 금액을 조회하는 함수
   * @param fan_idx 팬의 user idx
   * @param creator_idx 크리에이터의 user idx
   * @returns 팬이 크리에이터에게 후원한 총 금액
   */
  async getTotalDonation(fan_idx: number, creator_idx: number): Promise<number> {
    const fanRelation = await this.fanRepository.findFan(fan_idx, creator_idx);
    return fanRelation ? fanRelation.total_donation : 0;
  }

}
