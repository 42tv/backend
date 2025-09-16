import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePolicyDto,
  VersionIncrementType,
} from './dto/policy-request.dto';
import {
  PolicyResponseDto,
  PolicyListResponseDto,
} from './dto/policy-response.dto';

@Injectable()
export class PolicyService {
  constructor(private prisma: PrismaService) {}

  async createPolicy(
    createPolicyDto: CreatePolicyDto,
  ): Promise<PolicyResponseDto> {
    const latestPolicy = await this.prisma.policy.findFirst({
      where: { page: createPolicyDto.page },
      orderBy: { created_at: 'desc' },
    });
    console.log(`latestPolicy: ${JSON.stringify(latestPolicy)}`);

    let newVersion: string;
    if (latestPolicy) {
      newVersion = this.incrementVersion(
        latestPolicy.version,
        createPolicyDto.versionIncrementType,
      );

      await this.prisma.policy.updateMany({
        where: { page: createPolicyDto.page },
        data: { is_active: false },
      });
    } else {
      newVersion = '1.0';
    }

    const policy = await this.prisma.policy.create({
      data: {
        page: createPolicyDto.page,
        title: createPolicyDto.title,
        content: createPolicyDto.content,
        version: newVersion,
        is_active: true,
      },
    });

    return policy;
  }

  private incrementVersion(
    currentVersion: string,
    incrementType: VersionIncrementType,
  ): string {
    // 버전을 major.minor 형태로 파싱
    const versionParts = currentVersion.split('.');
    let major = parseInt(versionParts[0]) || 1;
    let minor = parseInt(versionParts[1]) || 0;

    console.log(`Current version: ${currentVersion}`);
    console.log(`Parsed - Major: ${major}, Minor: ${minor}`);

    switch (incrementType) {
      case VersionIncrementType.MAJOR:
        major += 1;
        minor = 0;
        break;
      case VersionIncrementType.MINOR:
        minor += 1;
        break;
    }

    const newVersion = `${major}.${minor}`;
    console.log(`New version: ${newVersion}`);

    return newVersion;
  }

  async getAllPolicies(): Promise<PolicyListResponseDto> {
    const policies = await this.prisma.policy.findMany({
      where: {
        is_active: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return {
      policies,
      total: policies.length,
    };
  }

  async getPolicyByPage(page: string): Promise<PolicyResponseDto> {
    const policy = await this.prisma.policy.findFirst({
      where: {
        page,
        is_active: true,
      },
    });

    if (!policy) {
      throw new NotFoundException(`정책 페이지 '${page}'를 찾을 수 없습니다.`);
    }

    return policy;
  }

  async deletePolicy(id: number): Promise<void> {
    const existingPolicy = await this.prisma.policy.findUnique({
      where: { id },
    });

    if (!existingPolicy) {
      throw new NotFoundException(`ID ${id}의 정책을 찾을 수 없습니다.`);
    }

    await this.prisma.policy.delete({
      where: { id },
    });
  }
}
