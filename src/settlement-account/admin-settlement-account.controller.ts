import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SettlementAccountVerificationStatus } from '@prisma/client';
import { IsNotEmpty, IsString } from 'class-validator';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { AdminAuditLogService } from 'src/admin-audit-log/admin-audit-log.service';
import { SettlementAccountRepository } from './settlement-account.repository';

class AccountActionReasonDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

/** 계좌번호·예금주는 마스킹 필드만 노출 */
function toMaskedResponse(account: any) {
  return {
    id: account.id,
    user: account.user,
    bank_code: account.bank_code,
    bank_name: account.bank_name,
    account_number_masked: account.account_number_masked,
    holder_name_masked: account.holder_name_masked,
    verification_status: account.verification_status,
    verification_provider: account.verification_provider,
    verification_requested_at: account.verification_requested_at,
    verified_at: account.verified_at,
    created_at: account.created_at,
    updated_at: account.updated_at,
  };
}

@Controller('admin/settlement-accounts')
@UseGuards(AdminGuard)
export class AdminSettlementAccountController {
  constructor(
    private readonly repository: SettlementAccountRepository,
    private readonly auditLogService: AdminAuditLogService,
  ) {}

  @Get()
  async getAccounts(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<SuccessResponseDto<{ accounts: any[] }>> {
    const take = limit ? parseInt(limit, 10) : 20;
    const currentPage = page ? parseInt(page, 10) : 1;

    const { items, total } = await this.repository.findAllAdmin({
      status:
        status &&
        Object.values(SettlementAccountVerificationStatus).includes(
          status as SettlementAccountVerificationStatus,
        )
          ? (status as SettlementAccountVerificationStatus)
          : undefined,
      limit: take,
      offset: (currentPage - 1) * take,
    });

    return ResponseWrapper.success(
      { accounts: items.map(toMaskedResponse) },
      '정산 계좌 목록을 조회했습니다.',
      {
        page: currentPage,
        limit: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    );
  }

  @Post(':id/verify')
  async verifyAccount(
    @Req() req,
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<any>> {
    const account = await this.findAccountOrThrow(id);
    if (
      account.verification_status ===
      SettlementAccountVerificationStatus.VERIFIED
    ) {
      throw new BadRequestException('이미 검증된 계좌입니다.');
    }

    const updated = await this.repository.updateVerificationStatus(id, {
      verification_status: SettlementAccountVerificationStatus.VERIFIED,
      verification_provider: 'admin-manual',
      verified_at: new Date(),
    });
    await this.auditLogService.record({
      adminIdx: req.user.idx,
      action: 'SETTLEMENT_ACCOUNT_VERIFY',
      targetType: 'SETTLEMENT_ACCOUNT',
      targetId: id,
      detail: {
        user_idx: account.user_idx,
        before_status: account.verification_status,
      },
    });
    return ResponseWrapper.success(
      toMaskedResponse({ ...updated, user: account.user }),
      '계좌 검증을 승인했습니다.',
    );
  }

  @Post(':id/reject')
  async rejectAccount(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: AccountActionReasonDto,
  ): Promise<SuccessResponseDto<any>> {
    const account = await this.findAccountOrThrow(id);
    if (
      account.verification_status ===
      SettlementAccountVerificationStatus.VERIFIED
    ) {
      throw new BadRequestException(
        '이미 검증된 계좌입니다. 철회(revoke)를 사용하세요.',
      );
    }

    const updated = await this.repository.updateVerificationStatus(id, {
      verification_status: SettlementAccountVerificationStatus.FAILED,
      verified_at: null,
    });
    await this.auditLogService.record({
      adminIdx: req.user.idx,
      action: 'SETTLEMENT_ACCOUNT_REJECT',
      targetType: 'SETTLEMENT_ACCOUNT',
      targetId: id,
      reason: dto.reason,
      detail: {
        user_idx: account.user_idx,
        before_status: account.verification_status,
      },
    });
    return ResponseWrapper.success(
      toMaskedResponse({ ...updated, user: account.user }),
      '계좌 검증을 거절했습니다.',
    );
  }

  @Post(':id/revoke')
  async revokeAccount(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: AccountActionReasonDto,
  ): Promise<SuccessResponseDto<any>> {
    const account = await this.findAccountOrThrow(id);
    if (
      account.verification_status !==
      SettlementAccountVerificationStatus.VERIFIED
    ) {
      throw new BadRequestException('검증된 계좌만 철회할 수 있습니다.');
    }

    const updated = await this.repository.updateVerificationStatus(id, {
      verification_status: SettlementAccountVerificationStatus.REVOKED,
      verified_at: null,
    });
    await this.auditLogService.record({
      adminIdx: req.user.idx,
      action: 'SETTLEMENT_ACCOUNT_REVOKE',
      targetType: 'SETTLEMENT_ACCOUNT',
      targetId: id,
      reason: dto.reason,
      detail: { user_idx: account.user_idx },
    });
    return ResponseWrapper.success(
      toMaskedResponse({ ...updated, user: account.user }),
      '계좌 검증을 철회했습니다.',
    );
  }

  private async findAccountOrThrow(id: string) {
    const account = await this.repository.findById(id);
    if (!account || account.deleted_at) {
      throw new NotFoundException('정산 계좌를 찾을 수 없습니다.');
    }
    return account;
  }
}
