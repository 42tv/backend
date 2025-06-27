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
   * 특정 팬이 방송인에게 얼마나 후원했는지 확인하여 팬 레벨을 계산하는 함수
   * 매니저인 경우 'manager' 레벨을 반환
   * @param fan_idx 팬의 user idx
   * @param broadcaster_idx 방송인의 user idx
   * @returns 현재 팬의 레벨 정보 또는 매니저 정보
   */
  async findFan(fanIdx: number, broadcasterIdx: number) {
    const fan = await this.fanRepository.findFan(fanIdx, broadcasterIdx);
    return fan;
  }



  /**
   * 팬이 방송인에게 후원한 총 금액을 조회하는 함수
   * @param fan_idx 팬의 user idx
   * @param broadcaster_idx 방송인의 user idx
   * @returns 팬이 방송인에게 후원한 총 금액
   */
  async getTotalDonation(fan_idx: number, broadcaster_idx: number): Promise<number> {
    const fanRelation = await this.fanRepository.findFan(fan_idx, broadcaster_idx);
    return fanRelation ? fanRelation.total_donation : 0;
  }

  /**
   * 맞는 팬 레벨을 찾는 함수
   * @param fanLevels 방송인의 팬 레벨 배열
   * @param totalDonation 팬의 총 후원 금액
   * @returns 해당하는 팬 레벨 정보
   */
  async matchFanLevel(fan_idx, broadcaster_idx) {
    const fan = await this.findFan(fan_idx, broadcaster_idx);
    // 높은 금액부터 내림차순으로 정렬된 팬 레벨에서 맞는 레벨 찾기
    // for (const level of fanLevels) {
    //   if (totalDonation >= level.min_donation) {
    //     return {
    //       level: {
    //         name: level.name,
    //         color: level.color,
    //       },
    //       totalDonation: totalDonation,
    //       isManager: false,
    //     };
    //   }
    // }
    
    // 어떤 레벨에도 도달하지 못한 경우 null 반환
    return null;
  }
}
