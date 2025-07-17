import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { AddManagerDto } from './dto/add.manager.dto';
import { RemoveManagerDto } from './dto/remove.manager.dto';
import { ManagerRepository } from './manager.repository';
import { RedisService } from 'src/redis/redis.service';
import { RedisMessages } from 'src/redis/interfaces/message-namespace';

@Injectable()
export class ManagerService {
  constructor(
    private readonly managerRepository: ManagerRepository,
    @Inject(forwardRef(() => RedisService))
    private readonly redisService: RedisService,
  ) {}

  /**
   * 특정 사용자가 크리에이터의 매니저인지 확인
   * @param managerIdx 매니저 사용자 ID
   * @param broadcasterIdx 크리에이터 사용자 ID
   * @returns 매니저 관계 정보 또는 null
   */
  async isManager(managerIdx: number, broadcasterIdx: number) {
    const manager = await this.managerRepository.findManager(managerIdx, broadcasterIdx);
    return manager ? true : false;
  }

  /**
   * 매니저 추가
   * @param broadcasterIdx 크리에이터(방송자) 사용자 ID
   * @param addManagerDto 추가할 매니저 정보
   * @returns 생성된 매니저 관계 정보
   */
  async addManager(broadcasterIdx: number, addManagerDto: AddManagerDto) {
    // 매니저로 추가할 사용자가 존재하는지 확인
    const broadcaster = await this.managerRepository.findUserByIdx(broadcasterIdx);
    const managerUser = await this.managerRepository.findUserByUserId(addManagerDto.userId);

    if (!managerUser) {
      throw new NotFoundException('해당 사용자 ID를 가진 사용자를 찾을 수 없습니다.');
    }

    // 자기 자신을 매니저로 추가하려는 경우 방지
    if (managerUser.idx === broadcasterIdx) {
      throw new BadRequestException('자기 자신을 매니저로 추가할 수 없습니다.');
    }

    // 이미 매니저 관계가 존재하는지 확인
    const existingManager = await this.managerRepository.findUniqueManager(
      broadcasterIdx,
      managerUser.idx,
    );

    if (existingManager) {
      throw new BadRequestException('이미 매니저로 등록된 사용자입니다.');
    }

    // 매니저 관계 생성
    const manager = await this.managerRepository.createManager(
      broadcasterIdx,
      managerUser.idx,
    );

    // Redis를 통해 모든 서버의 해당 room에 role 변경 알림
    await this.redisService.publishMessage(
      `room:${broadcaster.user_id}`,
      RedisMessages.roleChange(
        broadcaster.user_id,
        managerUser.user_id,
        managerUser.idx,
        managerUser.nickname,
        'viewer', // 이전 역할 (기본값으로 viewer 또는 member로 가정)
        'manager', // 새로운 역할
        broadcasterIdx,
        broadcaster.nickname
      )
    );

    return {
      success: true,
      message: '매니저가 성공적으로 추가되었습니다.',
      data: manager
    };
  }

  /**
   * 매니저 제거
   * @param broadcasterIdx 크리에이터(방송자) 사용자 ID
   * @param removeManagerDto 제거할 매니저 정보
   * @returns 제거 결과
   */
  async removeManager(broadcasterIdx: number, removeManagerDto: RemoveManagerDto) {
    // 제거할 매니저 사용자가 존재하는지 확인
    const broadcaster = await this.managerRepository.findUserByIdx(broadcasterIdx);
    const managerUser = await this.managerRepository.findUserByUserId(removeManagerDto.userId);

    if (!managerUser) {
      throw new NotFoundException('해당 사용자 ID를 가진 사용자를 찾을 수 없습니다.');
    }

    // 매니저 관계가 존재하는지 확인
    const existingManager = await this.managerRepository.findUniqueManager(
      broadcasterIdx,
      managerUser.idx,
    );

    if (!existingManager) {
      throw new NotFoundException('매니저로 등록되지 않은 사용자입니다.');
    }

    // 매니저 관계 삭제
    await this.managerRepository.deleteManager(broadcasterIdx, managerUser.idx);

    // Redis를 통해 모든 서버의 해당 room에 role 변경 알림
    await this.redisService.publishMessage(
      `room:${broadcaster.user_id}`,
      RedisMessages.roleChange(
        broadcaster.user_id,
        managerUser.user_id,
        managerUser.idx,
        managerUser.nickname,
        'manager', // 이전 역할
        'viewer', // 새로운 역할 (기본값으로 viewer로 변경)
        broadcasterIdx,
        broadcaster.nickname
      )
    );

    return {
      success: true,
      message: '매니저가 성공적으로 제거되었습니다.'
    };
  }
}