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
   * 팬 관계가 존재하는지 확인하는 함수
   * @param fan_idx 팬의 user idx
   * @param broadcaster_idx 방송인의 user idx
   * @returns 팬 관계 존재 여부
   */
  async isFan(fanIdx: number, broadcasterIdx: number): Promise<boolean> {
    const fan = await this.fanRepository.findFan(fanIdx, broadcasterIdx);
    return fan !== null;
  }

  /**
   * 팬이 방송인에게 후원한 총 금액을 조회하는 함수
   * @param fan_idx 팬의 user idx
   * @param broadcaster_idx 방송인의 user idx
   * @returns 팬이 방송인에게 후원한 총 금액
   */
  async getTotalDonation(
    fan_idx: number,
    broadcaster_idx: number,
  ): Promise<number> {
    const fanRelation = await this.fanRepository.findFan(
      fan_idx,
      broadcaster_idx,
    );
    return fanRelation ? fanRelation.total_donation : 0;
  }

  /**
   * 맞는 팬 레벨을 찾는 함수
   * @param fan_idx 팬의 user idx
   * @param broadcaster_idx 방송인의 user idx
   * @returns 해당하는 팬 레벨 정보 (total_donation 포함)
   */
  async matchFanLevel(fan_idx: number, broadcaster_idx: number) {
    // 팬 정보 조회
    const fan = await this.findFan(fan_idx, broadcaster_idx);
    if (!fan) {
      return null;
    }

    // matchFanLevelByAmount 재사용 (중복 로직 제거)
    const level = await this.matchFanLevelByAmount(
      broadcaster_idx,
      fan.total_donation,
    );

    if (!level) {
      return null;
    }

    // total_donation 추가하여 반환
    return {
      name: level.name,
      color: level.color,
      total_donation: fan.total_donation,
    };
  }

  /**
   * 후원 금액으로 팬 레벨을 계산하는 함수 (Fan 조회 없이)
   * 레벨 업그레이드 체크 시 사용 (후원 전/후 금액으로 각각 계산)
   * @param broadcaster_idx 방송인의 user idx
   * @param totalDonation 누적 후원 금액
   * @returns 해당하는 팬 레벨 정보 (id, name, color)
   * @note includeDefault: true로 조회하므로 min_donation: 0인 기본 레벨이 항상 포함되어 null을 반환하지 않음
   */
  async matchFanLevelByAmount(
    broadcaster_idx: number,
    totalDonation: number,
  ): Promise<{ id: number; name: string; color: string }> {
    // 방송인의 팬 레벨 목록을 높은 금액순으로 조회 (기본 레벨 포함)
    const fanLevels = await this.fanLevelService.findByUserIdx(
      broadcaster_idx,
      'desc',
      undefined,
      true, // includeDefault: true - 기본 레벨(min_donation: 0) 포함
    );

    // 높은 금액부터 내림차순으로 정렬된 팬 레벨에서 맞는 레벨 찾기
    for (const level of fanLevels) {
      if (totalDonation >= level.min_donation) {
        return {
          id: level.id,
          name: level.name,
          color: level.color,
        };
      }
    }

    // 이 코드는 도달할 수 없음 (min_donation: 0인 기본 레벨이 항상 존재)
    throw new Error(
      `방송인(${broadcaster_idx})의 기본 팬 레벨(min_donation: 0)이 존재하지 않습니다.`,
    );
  }

  /**
   * 팬의 총 후원 금액 업데이트 및 레벨 자동 계산
   * @param fan_idx 팬의 user idx
   * @param broadcaster_idx 방송인의 user idx
   * @param donation_amount 추가할 후원 금액
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 업데이트된 팬 관계
   */
  async updateTotalDonationWithLevel(
    fan_idx: number,
    broadcaster_idx: number,
    donation_amount: number,
    tx?: any,
  ) {
    // 1. 현재 팬 정보 조회
    const fan = await this.fanRepository.findFan(fan_idx, broadcaster_idx, tx);

    if (!fan) {
      throw new Error('Fan not found');
    }

    // 2. 새로운 total_donation 계산
    const newTotalDonation = fan.total_donation + donation_amount;

    // 3. 새로운 레벨 계산
    const newLevel = await this.matchFanLevelByAmount(
      broadcaster_idx,
      newTotalDonation,
    );

    // 4. 레벨 변경 여부 확인 후 업데이트
    const levelChanged = fan.current_level_id !== newLevel?.id;

    if (newLevel && levelChanged) {
      // 레벨이 변경된 경우 total_donation과 current_level_id 함께 업데이트
      return await this.fanRepository.updateTotalDonationAndLevel(
        fan_idx,
        broadcaster_idx,
        donation_amount,
        newLevel.id,
        tx,
      );
    } else {
      // 레벨 변경이 없는 경우 total_donation만 업데이트
      return await this.fanRepository.updateTotalDonation(
        fan_idx,
        broadcaster_idx,
        donation_amount,
        tx,
      );
    }
  }
}
