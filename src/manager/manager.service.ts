import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ManagerService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 특정 사용자가 크리에이터의 매니저인지 확인
   * @param managerIdx 매니저 사용자 ID
   * @param creatorIdx 크리에이터 사용자 ID
   * @returns 매니저 관계 정보 또는 null
   */
  async isManagerOf(managerIdx: number, creatorIdx: number) {
    return await this.prismaService.manager.findFirst({
      where: {
        manager_idx: managerIdx,
        broadcaster_idx: creatorIdx
      }
    });
  }

  /**
   * 매니저의 모든 크리에이터 조회
   * @param managerIdx 매니저 사용자 ID
   * @returns 관리하는 크리에이터 목록
   */
  async getManagedCreators(managerIdx: number) {
    return await this.prismaService.manager.findMany({
      where: {
        manager_idx: managerIdx
      },
      include: {
        broadcaster: {
          select: {
            idx: true,
            nickname: true,
            profile_img: true
          }
        }
      }
    });
  }

  /**
   * 크리에이터의 모든 매니저 조회
   * @param creatorIdx 크리에이터 사용자 ID
   * @returns 매니저 목록
   */
  async getManagers(creatorIdx: number) {
    return await this.prismaService.manager.findMany({
      where: {
        broadcaster_idx: creatorIdx
      },
      include: {
        manager: {
          select: {
            idx: true,
            nickname: true,
            profile_img: true
          }
        }
      }
    });
  }

  /**
   * 매니저 관계 생성
   * @param managerIdx 매니저 사용자 ID
   * @param creatorIdx 크리에이터 사용자 ID
   * @returns 생성된 매니저 관계
   */
  async createManagerRelation(managerIdx: number, creatorIdx: number) {
    return await this.prismaService.manager.create({
      data: {
        manager_idx: managerIdx,
        broadcaster_idx: creatorIdx
      }
    });
  }

  /**
   * 매니저 관계 삭제
   * @param managerIdx 매니저 사용자 ID
   * @param creatorIdx 크리에이터 사용자 ID
   * @returns 삭제된 매니저 관계
   */
  async deleteManagerRelation(managerIdx: number, creatorIdx: number) {
    return await this.prismaService.manager.deleteMany({
      where: {
        manager_idx: managerIdx,
        broadcaster_idx: creatorIdx
      }
    });
  }
}