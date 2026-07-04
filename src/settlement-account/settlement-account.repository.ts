import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettlementAccountVerificationStatus } from '@prisma/client';

interface AccountData {
  bank_code: string;
  bank_name: string;
  account_number_encrypted: string;
  account_number_masked: string;
  account_fingerprint: string;
  holder_name_encrypted: string | null;
  holder_name_masked: string | null;
}

@Injectable()
export class SettlementAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserIdx(userIdx: number) {
    return this.prisma.settlementAccount.findFirst({
      where: { user_idx: userIdx, deleted_at: null },
    });
  }

  findByUserIdxIncludeDeleted(userIdx: number) {
    return this.prisma.settlementAccount.findFirst({
      where: { user_idx: userIdx },
    });
  }

  async upsert(userIdx: number, data: AccountData) {
    const existing = await this.findByUserIdxIncludeDeleted(userIdx);

    if (!existing) {
      return this.prisma.settlementAccount.create({
        data: {
          user_idx: userIdx,
          ...data,
          verification_status: SettlementAccountVerificationStatus.UNVERIFIED,
        },
      });
    }

    const fingerprintChanged =
      existing.account_fingerprint !== data.account_fingerprint;
    const isDeleted = existing.deleted_at !== null;

    const resetVerification = fingerprintChanged || isDeleted;

    return this.prisma.settlementAccount.update({
      where: { id: existing.id },
      data: {
        ...data,
        deleted_at: null,
        ...(resetVerification
          ? {
              verification_status:
                SettlementAccountVerificationStatus.UNVERIFIED,
              verified_at: null,
            }
          : {}),
      },
    });
  }

  updateVerificationStatus(
    accountId: string,
    data: {
      verification_status: SettlementAccountVerificationStatus;
      verification_provider?: string;
      verification_provider_ref?: string;
      verification_requested_at?: Date;
      verified_at?: Date | null;
    },
  ) {
    return this.prisma.settlementAccount.update({
      where: { id: accountId },
      data,
    });
  }

  softDelete(userIdx: number) {
    return this.prisma.settlementAccount.updateMany({
      where: { user_idx: userIdx, deleted_at: null },
      data: {
        deleted_at: new Date(),
        verification_status: SettlementAccountVerificationStatus.UNVERIFIED,
      },
    });
  }

  findById(accountId: string) {
    return this.prisma.settlementAccount.findUnique({
      where: { id: accountId },
      include: {
        user: { select: { idx: true, user_id: true, nickname: true } },
      },
    });
  }

  /**
   * 관리자용 계좌 목록 (검증 상태 필터 + 페이징, 삭제 계좌 제외)
   */
  async findAllAdmin(options: {
    status?: SettlementAccountVerificationStatus;
    limit: number;
    offset: number;
  }) {
    const where = {
      deleted_at: null,
      ...(options.status && { verification_status: options.status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.settlementAccount.findMany({
        where,
        include: {
          user: { select: { idx: true, user_id: true, nickname: true } },
        },
        orderBy: { updated_at: 'desc' },
        take: options.limit,
        skip: options.offset,
      }),
      this.prisma.settlementAccount.count({ where }),
    ]);
    return { items, total };
  }
}
