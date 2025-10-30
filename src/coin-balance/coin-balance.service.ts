import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CoinBalanceRepository } from './coin-balance.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoinBalanceService {
  constructor(
    private readonly coinBalanceRepository: CoinBalanceRepository,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * 코인 잔액 생성 (User 생성 트랜잭션에서 호출)
   * @param user_idx 사용자 ID
   * @param tx 트랜잭션 클라이언트 (필수)
   * @returns 생성된 코인 잔액
   */
  async createCoinBalance(user_idx: number, tx: any) {
    return await this.coinBalanceRepository.create(user_idx, tx);
  }

  /**
   * 사용자의 코인 잔액 조회
   * @param user_idx 사용자 ID
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 코인 잔액
   */
  async getCoinBalance(user_idx: number, tx?: any) {
    const coinBalance = await this.coinBalanceRepository.findByUserId(
      user_idx,
      tx,
    );

    if (!coinBalance) {
      throw new NotFoundException('코인 잔액 정보를 찾을 수 없습니다.');
    }

    return coinBalance;
  }

  /**
   * 코인 충전으로 인한 잔액 증가 및 총 충전액 업데이트
   * @param user_idx 사용자 ID
   * @param amount 충전 금액
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 업데이트된 코인 잔액
   */
  async addCoinsFromTopup(user_idx: number, amount: number, tx?: any) {
    if (amount <= 0) {
      throw new BadRequestException('충전 금액은 0보다 커야 합니다.');
    }

    // 코인 잔액이 없으면 생성
    const existingBalance =
      await this.coinBalanceRepository.findByUserId(user_idx);

    if (!existingBalance) {
      await this.coinBalanceRepository.create(user_idx, tx);
    }

    // 잔액 증가 및 총 충전액 증가
    return await this.coinBalanceRepository.increaseBalance(
      user_idx,
      amount,
      tx,
    );
  }

  /**
   * 코인 사용으로 인한 잔액 감소 및 총 사용액 업데이트
   * @param user_idx 사용자 ID
   * @param amount 사용 금액
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 업데이트된 코인 잔액
   */
  async useCoins(user_idx: number, amount: number, tx?: any) {
    if (amount <= 0) {
      throw new BadRequestException('사용 금액은 0보다 커야 합니다.');
    }

    const coinBalance = await this.coinBalanceRepository.findByUserId(user_idx);

    if (!coinBalance) {
      throw new NotFoundException('코인 잔액 정보를 찾을 수 없습니다.');
    }

    if (coinBalance.coin_balance < amount) {
      throw new BadRequestException('잔액이 부족합니다.');
    }

    // 잔액 감소 및 총 사용액 증가
    return await this.coinBalanceRepository.decreaseBalance(
      user_idx,
      amount,
      tx,
    );
  }

  /**
   * 후원 받은 코인 증가 (스트리머가 후원을 받을 때)
   * @param user_idx 사용자 ID
   * @param amount 받은 금액
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 업데이트된 코인 잔액
   */
  async receiveCoins(user_idx: number, amount: number, tx?: any) {
    if (amount <= 0) {
      throw new BadRequestException('받은 금액은 0보다 커야 합니다.');
    }

    const coinBalance = await this.coinBalanceRepository.findByUserId(user_idx);

    if (!coinBalance) {
      // 코인 잔액이 없으면 생성
      await this.coinBalanceRepository.create(user_idx, tx);
    }

    // 잔액 증가 및 총 받은 금액 증가
    return await this.coinBalanceRepository.increaseReceivedBalance(
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
   * @returns 업데이트된 코인 잔액
   */
  async refundCoins(user_idx: number, amount: number, tx?: any) {
    if (amount <= 0) {
      throw new BadRequestException('환불 금액은 0보다 커야 합니다.');
    }

    const coinBalance = await this.coinBalanceRepository.findByUserId(user_idx);

    if (!coinBalance) {
      throw new NotFoundException('코인 잔액 정보를 찾을 수 없습니다.');
    }

    if (coinBalance.coin_balance < amount) {
      throw new BadRequestException('환불할 수 있는 잔액이 부족합니다.');
    }

    return await this.coinBalanceRepository.decreaseBalance(
      user_idx,
      amount,
      tx,
    );
  }

  /**
   * 코인 잔액 통계 조회 (관리자용)
   * @returns 코인 잔액 통계
   */
  async getCoinStats() {
    return await this.coinBalanceRepository.getCoinStats();
  }

  /**
   * 사용자 삭제 시 코인 잔액 정보 삭제
   * @param user_idx 사용자 ID
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 삭제된 코인 잔액
   */
  async deleteCoinBalanceByUserId(user_idx: number, tx?: any) {
    const coinBalance = await this.coinBalanceRepository.findByUserId(user_idx);

    if (!coinBalance) {
      throw new NotFoundException('코인 잔액 정보를 찾을 수 없습니다.');
    }

    return await this.coinBalanceRepository.deleteByUserId(user_idx, tx);
  }
}
