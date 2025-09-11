import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePolicyDto, UpdatePolicyDto } from './dto/policy-request.dto';
import {
  PolicyResponseDto,
  PolicyListResponseDto,
} from './dto/policy-response.dto';
import {
  PolicyAgreementResponseDto,
  UserPolicyAgreementsResponseDto,
  PolicyAgreementStatusDto,
} from './dto/policy-agreement.dto';

@Injectable()
export class PolicyService {
  constructor(private prisma: PrismaService) {}

  async createPolicy(
    createPolicyDto: CreatePolicyDto,
  ): Promise<PolicyResponseDto> {
    const existingPolicy = await this.prisma.policy.findUnique({
      where: { page: createPolicyDto.page },
    });

    if (existingPolicy) {
      throw new ConflictException(
        `정책 페이지 '${createPolicyDto.page}'가 이미 존재합니다.`,
      );
    }

    const policy = await this.prisma.policy.create({
      data: {
        page: createPolicyDto.page,
        title: createPolicyDto.title,
        content: createPolicyDto.content,
        version: createPolicyDto.version,
        is_active: createPolicyDto.is_active ?? true,
      },
    });

    return policy;
  }

  async getAllPolicies(): Promise<PolicyListResponseDto> {
    const policies = await this.prisma.policy.findMany({
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

  async getPolicyById(id: number): Promise<PolicyResponseDto> {
    const policy = await this.prisma.policy.findUnique({
      where: { id },
    });

    if (!policy) {
      throw new NotFoundException(`ID ${id}의 정책을 찾을 수 없습니다.`);
    }

    return policy;
  }

  async updatePolicy(
    id: number,
    updatePolicyDto: UpdatePolicyDto,
  ): Promise<PolicyResponseDto> {
    const existingPolicy = await this.prisma.policy.findUnique({
      where: { id },
    });

    if (!existingPolicy) {
      throw new NotFoundException(`ID ${id}의 정책을 찾을 수 없습니다.`);
    }

    const policy = await this.prisma.policy.update({
      where: { id },
      data: updatePolicyDto,
    });

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

  // PolicyAgreement 관련 메서드들
  async agreeToPolicyByPage(
    userIdx: number,
    page: string,
    ipAddress?: string,
  ): Promise<PolicyAgreementResponseDto> {
    // 활성화된 정책 조회
    const policy = await this.prisma.policy.findFirst({
      where: { page, is_active: true },
    });

    if (!policy) {
      throw new NotFoundException(`정책 페이지 '${page}'를 찾을 수 없습니다.`);
    }

    return this.agreeToPolicy(userIdx, policy.id, policy.version, ipAddress);
  }

  async agreeToPolicy(
    userIdx: number,
    policyId: number,
    policyVersion: string,
    ipAddress?: string,
  ): Promise<PolicyAgreementResponseDto> {
    // 정책 존재 확인
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      throw new NotFoundException(`ID ${policyId}의 정책을 찾을 수 없습니다.`);
    }

    // 이미 해당 버전에 동의했는지 확인
    const existingAgreement = await this.prisma.policyAgreement.findUnique({
      where: {
        user_idx_policy_id_policy_version: {
          user_idx: userIdx,
          policy_id: policyId,
          policy_version: policyVersion,
        },
      },
    });

    if (existingAgreement) {
      throw new ConflictException(
        `이미 정책 버전 '${policyVersion}'에 동의하셨습니다.`,
      );
    }

    // 새로운 동의 생성
    const agreement = await this.prisma.policyAgreement.create({
      data: {
        user_idx: userIdx,
        policy_id: policyId,
        policy_version: policyVersion,
        ip_address: ipAddress,
      },
      include: {
        policy: {
          select: {
            page: true,
            title: true,
            content: true,
          },
        },
      },
    });

    return agreement;
  }

  async getUserPolicyAgreements(
    userIdx: number,
  ): Promise<UserPolicyAgreementsResponseDto> {
    const agreements = await this.prisma.policyAgreement.findMany({
      where: { user_idx: userIdx },
      include: {
        policy: {
          select: {
            page: true,
            title: true,
            content: true,
          },
        },
      },
      orderBy: { agreed_at: 'desc' },
    });

    return {
      agreements,
      total: agreements.length,
    };
  }

  async checkPolicyAgreementStatus(
    userIdx: number,
    page: string,
  ): Promise<PolicyAgreementStatusDto> {
    // 현재 활성화된 정책 조회
    const policy = await this.prisma.policy.findFirst({
      where: { page, is_active: true },
    });

    if (!policy) {
      throw new NotFoundException(`정책 페이지 '${page}'를 찾을 수 없습니다.`);
    }

    // 사용자의 최신 동의 내역 조회
    const latestAgreement = await this.prisma.policyAgreement.findFirst({
      where: {
        user_idx: userIdx,
        policy_id: policy.id,
      },
      orderBy: { agreed_at: 'desc' },
    });

    return {
      page: policy.page,
      title: policy.title,
      current_version: policy.version,
      is_agreed: latestAgreement !== null,
      agreed_version: latestAgreement?.policy_version,
      agreed_at: latestAgreement?.agreed_at,
    };
  }

  async getAllPolicyAgreementStatuses(
    userIdx: number,
  ): Promise<PolicyAgreementStatusDto[]> {
    // 모든 활성화된 정책 조회
    const policies = await this.prisma.policy.findMany({
      where: { is_active: true },
      select: {
        id: true,
        page: true,
        title: true,
        version: true,
      },
    });

    // 각 정책에 대한 동의 상태 확인
    const statusPromises = policies.map(async (policy) => {
      const latestAgreement = await this.prisma.policyAgreement.findFirst({
        where: {
          user_idx: userIdx,
          policy_id: policy.id,
        },
        orderBy: { agreed_at: 'desc' },
      });

      return {
        page: policy.page,
        title: policy.title,
        current_version: policy.version,
        is_agreed: latestAgreement !== null,
        agreed_version: latestAgreement?.policy_version,
        agreed_at: latestAgreement?.agreed_at,
      };
    });

    return Promise.all(statusPromises);
  }
}
