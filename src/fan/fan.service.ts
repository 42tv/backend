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
    const managerRelation = await this.managerService.isManagerOf(fanIdx, broadcasterIdx);
    // const noralUser = {
    //   id:
    // }

    if (!fanRelation && !managerRelation) {
      return null; // 팬도 아니고 매니저도 아님
    }
    
    // 매니저인 경우 매니저 레벨 반환
    if (managerRelation) {
      return {
        level: {
          id: -2,
          name: 'manager',
          min_donation: 0,
          color: '#FF6B35', // 매니저 전용 색상
        },
        totalDonation: 0,
        isManager: true,
      };
    }

    // 크리에이터의 팬 레벨 설정 조회
    const fanLevels = await this.fanLevelService.findByUserIdx(broadcasterIdx, 'desc');

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
      level: {
        id: -1,
        name: 'normal',
        min_donation: 0,
        color: '#6B7280',
      },
      totalDonation: 0,
    };
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
