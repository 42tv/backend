import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddManagerDto } from './dto/add.manager.dto';
import { RemoveManagerDto } from './dto/remove.manager.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

@Injectable()
export class ManagerService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 특정 사용자가 크리에이터의 매니저인지 확인
   * @param managerIdx 매니저 사용자 ID
   * @param creatorIdx 크리에이터 사용자 ID
   * @returns 매니저 관계 정보 또는 null
   */
  async isManager(managerIdx: number, broadcasteridx: number) {
    const manager =  await this.prismaService.manager.findFirst({
      where: {
        manager_idx: managerIdx,
        broadcaster_idx: broadcasteridx
      }
    });
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
    const managerUser = await this.prismaService.user.findUnique({
      where: { user_id: addManagerDto.userId }
    });

    if (!managerUser) {
      throw new NotFoundException('해당 사용자 ID를 가진 사용자를 찾을 수 없습니다.');
    }

    // 자기 자신을 매니저로 추가하려는 경우 방지
    if (managerUser.idx === broadcasterIdx) {
      throw new BadRequestException('자기 자신을 매니저로 추가할 수 없습니다.');
    }

    // 이미 매니저 관계가 존재하는지 확인
    const existingManager = await this.prismaService.manager.findUnique({
      where: {
        broadcaster_idx_manager_idx: {
          broadcaster_idx: broadcasterIdx,
          manager_idx: managerUser.idx
        }
      }
    });

    if (existingManager) {
      throw new BadRequestException('이미 매니저로 등록된 사용자입니다.');
    }

    // 매니저 관계 생성
    const manager = await this.prismaService.manager.create({
      data: {
        broadcaster_idx: broadcasterIdx,
        manager_idx: managerUser.idx
      },
      include: {
        manager: {
          select: {
            idx: true,
            user_id: true,
            nickname: true,
            profile_img: true
          }
        }
      }
    });

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
    const managerUser = await this.prismaService.user.findUnique({
      where: { user_id: removeManagerDto.userId }
    });

    if (!managerUser) {
      throw new NotFoundException('해당 사용자 ID를 가진 사용자를 찾을 수 없습니다.');
    }

    // 매니저 관계가 존재하는지 확인
    const existingManager = await this.prismaService.manager.findUnique({
      where: {
        broadcaster_idx_manager_idx: {
          broadcaster_idx: broadcasterIdx,
          manager_idx: managerUser.idx
        }
      }
    });

    if (!existingManager) {
      throw new NotFoundException('매니저로 등록되지 않은 사용자입니다.');
    }

    // 매니저 관계 삭제
    await this.prismaService.manager.delete({
      where: {
        broadcaster_idx_manager_idx: {
          broadcaster_idx: broadcasterIdx,
          manager_idx: managerUser.idx
        }
      }
    });

    return {
      success: true,
      message: '매니저가 성공적으로 제거되었습니다.'
    };
  }
}