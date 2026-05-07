import { Injectable, NotFoundException } from '@nestjs/common';
import { SettlementAccountRepository } from './settlement-account.repository';
import { UpsertSettlementAccountDto } from './dto/upsert-settlement-account.dto';
import { SettlementAccountResponseDto } from './dto/settlement-account-response.dto';
import {
  encryptAccountNumber,
  maskAccountNumber,
  generateFingerprint,
  encryptValue,
  maskName,
} from './utils/account-crypto.util';

@Injectable()
export class SettlementAccountService {
  constructor(private readonly repository: SettlementAccountRepository) {}

  async upsert(
    userIdx: number,
    dto: UpsertSettlementAccountDto,
  ): Promise<SettlementAccountResponseDto> {
    const account = await this.repository.upsert(userIdx, {
      bank_code: dto.bank_code,
      bank_name: dto.bank_name,
      account_number_encrypted: encryptAccountNumber(dto.account_number),
      account_number_masked: maskAccountNumber(dto.account_number),
      account_fingerprint: generateFingerprint(
        dto.bank_code,
        dto.account_number,
      ),
      holder_name_encrypted: dto.holder_name
        ? encryptValue(dto.holder_name)
        : null,
      holder_name_masked: dto.holder_name ? maskName(dto.holder_name) : null,
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
