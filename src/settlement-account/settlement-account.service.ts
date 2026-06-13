import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SettlementAccountVerificationStatus } from '@prisma/client';
import { SettlementAccountRepository } from './settlement-account.repository';
import { UpsertSettlementAccountDto } from './dto/upsert-settlement-account.dto';
import { SettlementAccountResponseDto } from './dto/settlement-account-response.dto';
import { SettlementAccountVerificationProvider } from './providers/account-verification-provider.interface';
import {
  decryptAccountNumber,
  encryptAccountNumber,
  generateAccountFingerprint,
  maskAccountNumber,
  maskHolderName,
} from './utils/account-crypto.util';

@Injectable()
export class SettlementAccountService {
  constructor(
    private readonly repository: SettlementAccountRepository,
    private readonly verificationProvider: SettlementAccountVerificationProvider,
  ) {}

  async upsert(
    userIdx: number,
    dto: UpsertSettlementAccountDto,
  ): Promise<SettlementAccountResponseDto> {
    const account = await this.repository.upsert(userIdx, {
      bank_code: dto.bank_code,
      bank_name: dto.bank_name,
      account_number_encrypted: encryptAccountNumber(dto.account_number),
      account_number_masked: maskAccountNumber(dto.account_number),
      account_fingerprint: generateAccountFingerprint(
        dto.bank_code,
        dto.account_number,
      ),
      holder_name_encrypted: dto.holder_name
        ? encryptAccountNumber(dto.holder_name)
        : null,
      holder_name_masked: dto.holder_name
        ? maskHolderName(dto.holder_name)
        : null,
    });
    return this.toResponse(account);
  }

  async getByUserIdx(userIdx: number): Promise<SettlementAccountResponseDto> {
    const account = await this.repository.findByUserIdx(userIdx);
    if (!account) throw new NotFoundException('등록된 정산 계좌가 없습니다.');
    return this.toResponse(account);
  }

  async delete(userIdx: number): Promise<void> {
    const account = await this.repository.findByUserIdx(userIdx);
    if (!account) throw new NotFoundException('등록된 정산 계좌가 없습니다.');
    await this.repository.softDelete(userIdx);
  }

  async verify(
    userIdx: number,
  ): Promise<{ verification_status: string; failure_reason: string | null }> {
    const account = await this.repository.findByUserIdx(userIdx);
    if (!account) throw new NotFoundException('등록된 계좌가 없습니다.');
    if (
      account.verification_status ===
      SettlementAccountVerificationStatus.VERIFIED
    ) {
      throw new BadRequestException('이미 인증된 계좌입니다.');
    }

    await this.repository.updateVerificationStatus(account.id, {
      verification_status: SettlementAccountVerificationStatus.PENDING,
      verification_requested_at: new Date(),
    });

    const result = await this.verificationProvider.verify({
      user_idx: userIdx,
      account_id: account.id,
      bank_code: account.bank_code,
      account_number: decryptAccountNumber(account.account_number_encrypted),
      holder_name: account.holder_name_encrypted
        ? decryptAccountNumber(account.holder_name_encrypted)
        : undefined,
    });

    const providerName = process.env.APP_ENV === 'prod' ? 'prod' : 'dev';

    if (result.verified) {
      await this.repository.updateVerificationStatus(account.id, {
        verification_status: SettlementAccountVerificationStatus.VERIFIED,
        verification_provider: providerName,
        verification_provider_ref: result.provider_ref,
        verified_at: new Date(),
      });
    } else {
      await this.repository.updateVerificationStatus(account.id, {
        verification_status: SettlementAccountVerificationStatus.FAILED,
      });
    }

    return {
      verification_status: result.verified ? 'VERIFIED' : 'FAILED',
      failure_reason: result.failure_reason ?? null,
    };
  }

  private toResponse(account: any): SettlementAccountResponseDto {
    return {
      id: account.id,
      bank_code: account.bank_code,
      bank_name: account.bank_name,
      account_number_masked: account.account_number_masked,
      holder_name_masked: account.holder_name_masked,
      verification_status: account.verification_status,
      verified_at: account.verified_at,
      created_at: account.created_at,
      updated_at: account.updated_at,
    };
  }
}
