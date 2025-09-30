import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { WalletBalanceRepository } from './wallet-balance.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletBalanceService {
  constructor(
    private readonly walletBalanceRepository: WalletBalanceRepository,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * 사용자의 지갑 잔액 조회 (없으면 생성)
   * @param user_idx 사용자 ID
   * @returns 지갑 잔액
   */
  async getOrCreateWalletBalance(user_idx: number) {
    let walletBalance =
      await this.walletBalanceRepository.findByUserId(user_idx);

    if (!walletBalance) {
      walletBalance = await this.walletBalanceRepository.create(user_idx);
    }

    return walletBalance;
  }

  /**
   * 사용자의 지갑 잔액 조회
   * @param user_idx 사용자 ID
   * @returns 지갑 잔액
   */
  async getWalletBalance(user_idx: number) {
    const walletBalance =
      await this.walletBalanceRepository.findByUserId(user_idx);

    if (!walletBalance) {
      throw new NotFoundException('지갑 정보를 찾을 수 없습니다.');
    }

    return walletBalance;
  }

  /**
   * 코인 충전으로 인한 잔액 증가
   * @param user_idx 사용자 ID
   * @param amount 충전 금액
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 업데이트된 지갑 잔액
   */
  async addCoinsFromTopup(user_idx: number, amount: number, tx?: any) {
    if (amount <= 0) {
      throw new BadRequestException('충전 금액은 0보다 커야 합니다.');
    }

    // 지갑이 없으면 생성
    const existingWallet =
      await this.walletBalanceRepository.findByUserId(user_idx);

    if (!existingWallet) {
      await this.walletBalanceRepository.create(user_idx, tx);
    }

    return await this.walletBalanceRepository.increaseBalance(
      user_idx,
      amount,
      tx,
    );
  }

  /**
   * 코인 사용으로 인한 잔액 감소
   * @param user_idx 사용자 ID
   * @param amount 사용 금액
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 업데이트된 지갑 잔액
   */
  async useCoins(user_idx: number, amount: number, tx?: any) {
    if (amount <= 0) {
      throw new BadRequestException('사용 금액은 0보다 커야 합니다.');
    }

    const walletBalance =
      await this.walletBalanceRepository.findByUserId(user_idx);

    if (!walletBalance) {
      throw new NotFoundException('지갑 정보를 찾을 수 없습니다.');
    }

    if (walletBalance.coin_balance < amount) {
      throw new BadRequestException('잔액이 부족합니다.');
    }

    return await this.walletBalanceRepository.decreaseBalance(
      user_idx,
      amount,
      tx,
    );
  }

  /**
   * 환불로 인한 잔액 감소
   * @param user_idx 사용자 ID
   * @param amount 환불 금액
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 업데이트된 지갑 잔액
   */
  async refundCoins(user_idx: number, amount: number, tx?: any) {
    if (amount <= 0) {
      throw new BadRequestException('환불 금액은 0보다 커야 합니다.');
    }

    const walletBalance =
      await this.walletBalanceRepository.findByUserId(user_idx);

    if (!walletBalance) {
      throw new NotFoundException('지갑 정보를 찾을 수 없습니다.');
    }

    if (walletBalance.coin_balance < amount) {
      throw new BadRequestException('환불할 수 있는 잔액이 부족합니다.');
    }

    return await this.walletBalanceRepository.decreaseBalance(
      user_idx,
      amount,
      tx,
    );
  }

  /**
   * 지갑 잔액 통계 조회 (관리자용)
   * @returns 지갑 잔액 통계
   */
  async getWalletStats() {
    return await this.walletBalanceRepository.getWalletStats();
  }

  /**
   * 사용자 삭제 시 지갑 정보 삭제
   * @param user_idx 사용자 ID
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 삭제된 지갑 잔액
   */
  async deleteWalletByUserId(user_idx: number, tx?: any) {
    const walletBalance =
      await this.walletBalanceRepository.findByUserId(user_idx);

    if (!walletBalance) {
      throw new NotFoundException('지갑 정보를 찾을 수 없습니다.');
    }

    return await this.walletBalanceRepository.deleteByUserId(user_idx, tx);
  }
}
