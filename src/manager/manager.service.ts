import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { AddManagerDto } from './dto/add.manager.dto';
import { RemoveManagerDto } from './dto/remove.manager.dto';
import { ManagerRepository } from './manager.repository';
import { RedisService } from 'src/redis/redis.service';
import { RedisMessages } from 'src/redis/interfaces/message-namespace';
import { RoleChangeType } from 'src/redis/interfaces/room.message';
import { FanService } from 'src/fan/fan.service';
import { UserService } from 'src/user/user.service';
import { getUserRoleColor } from 'src/constants/chat-colors';

@Injectable()
export class ManagerService {
  constructor(
    private readonly managerRepository: ManagerRepository,
    @Inject(forwardRef(() => RedisService))
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => FanService))
    private readonly fanService: FanService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  /**
   * 특정 사용자가 크리에이터의 매니저인지 확인
   * @param managerIdx 매니저 사용자 ID
   * @param broadcasterIdx 크리에이터 사용자 ID
   * @returns 매니저 관계 정보 또는 null
   */
  async isManager(managerIdx: number, broadcasterIdx: number) {
    const manager = await this.managerRepository.findManager(
      managerIdx,
      broadcasterIdx,
    );
    return manager ? true : false;
  }

  /**
   * 사용자의 적절한 역할을 결정합니다.
   * 매니저가 해임된 경우 적절한 역할(member/viewer)과 등급 정보를 반환합니다.
   * @param userIdx 사용자 ID
   * @param broadcasterIdx 방송자 ID
   * @returns 사용자 역할 정보
   */
  private async determineUserRole(
    userIdx: number,
    broadcasterIdx: number,
  ): Promise<{
    role: 'member' | 'viewer';
    gradeInfo: { name: string; color: string };
  }> {
    // 팬 레벨 확인
    const fanLevel = await this.fanService.matchFanLevel(
      userIdx,
      broadcasterIdx,
    );

    if (fanLevel) {
      // 팬 레벨이 있으면 member
      return {
        role: 'member',
        gradeInfo: {
          name: fanLevel.name,
          color: fanLevel.color,
        },
      };
    } else {
      // 팬 레벨이 없으면 viewer
      return {
        role: 'viewer',
        gradeInfo: {
          name: 'viewer',
          color: getUserRoleColor('viewer'),
        },
      };
    }
  }

  /**
   * 매니저 추가
   * @param broadcasterIdx 크리에이터(방송자) 사용자 ID
   * @param addManagerDto 추가할 매니저 정보
   * @returns 생성된 매니저 관계 정보
   */
  async addManager(broadcasterIdx: number, addManagerDto: AddManagerDto) {
    // 매니저로 추가할 사용자가 존재하는지 확인
    const broadcaster =
      await this.managerRepository.findUserByIdx(broadcasterIdx);
    const managerUser = await this.userService.findByUserId(
      addManagerDto.userId,
    );

    if (!managerUser) {
      throw new NotFoundException(
        '해당 사용자 ID를 가진 사용자를 찾을 수 없습니다.',
      );
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

    // 기존 사용자 역할 확인
    const currentUserRole = await this.determineUserRole(
      managerUser.idx,
      broadcasterIdx,
    );

    // 매니저 관계 생성
    const manager = await this.managerRepository.createManager(
      broadcasterIdx,
      managerUser.idx,
    );

    // Redis의 viewer 정보 업데이트 (manager role로 변경)
    await this.redisService.updateViewerRole(
      broadcaster.user_id,
      managerUser.user_id,
      'manager',
      {
        name: 'manager',
        color: getUserRoleColor('manager'),
      },
    );

    // Redis를 통해 모든 서버의 해당 room에 role 변경 알림
    await this.redisService.publishRoomMessage(
      `room:${broadcaster.user_id}`,
      RedisMessages.roleChange(
        broadcaster.user_id,
        RoleChangeType.MANAGER_GRANT,
        managerUser.idx,
        managerUser.user_id,
        managerUser.nickname,
        currentUserRole.role,
        'manager',
        currentUserRole.gradeInfo.name,
        currentUserRole.gradeInfo.color,
      ),
    );

    return {
      success: true,
      message: '매니저가 성공적으로 추가되었습니다.',
      data: manager,
    };
  }

  /**
   * 매니저 제거
   * @param broadcasterIdx 크리에이터(방송자) 사용자 ID
   * @param removeManagerDto 제거할 매니저 정보
   * @returns 제거 결과
   */
  async removeManager(
    broadcasterIdx: number,
    removeManagerDto: RemoveManagerDto,
  ) {
    // 제거할 매니저 사용자가 존재하는지 확인
    const broadcaster =
      await this.managerRepository.findUserByIdx(broadcasterIdx);
    const managerUser = await this.userService.findByUserId(
      removeManagerDto.userId,
    );

    if (!managerUser) {
      throw new NotFoundException(
        '해당 사용자 ID를 가진 사용자를 찾을 수 없습니다.',
      );
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

    // 해임된 사용자의 적절한 역할 결정
    const userRole = await this.determineUserRole(
      managerUser.idx,
      broadcasterIdx,
    );

    // Redis의 viewer 정보 업데이트 (적절한 role로 변경)
    await this.redisService.updateViewerRole(
      broadcaster.user_id,
      managerUser.user_id,
      userRole.role,
      userRole.gradeInfo,
    );

    // Redis를 통해 모든 서버의 해당 room에 role 변경 알림
    await this.redisService.publishRoomMessage(
      `room:${broadcaster.user_id}`,
      RedisMessages.roleChange(
        broadcaster.user_id,
        RoleChangeType.MANAGER_REVOKE,
        managerUser.idx,
        managerUser.user_id,
        managerUser.nickname,
        'manager',
        userRole.role,
        userRole.gradeInfo.name,
        userRole.gradeInfo.color,
      ),
    );

    return {
      success: true,
      message: '매니저가 성공적으로 제거되었습니다.',
    };
  }
}
