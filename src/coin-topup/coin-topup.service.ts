import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { CoinTopupRepository } from './coin-topup.repository';
import { ProcessTopupDto } from './dto/create-coin-topup.dto';
import { ProductService } from '../product/product.service';
import { PaymentTransactionService } from '../payment/payment-transaction.service';
import { WalletBalanceService } from '../wallet-balance/wallet-balance.service';
import { CoinUsageService } from '../coin-usage/coin-usage.service';
import { PrismaService } from '../prisma/prisma.service';
import { TopupStatus, PaymentTransactionStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class CoinTopupService {
  constructor(
    private readonly coinTopupRepository: CoinTopupRepository,
    private readonly productService: ProductService,
    @Inject(forwardRef(() => PaymentTransactionService))
    private readonly paymentTransactionService: PaymentTransactionService,
    private readonly walletBalanceService: WalletBalanceService,
    private readonly coinUsageService: CoinUsageService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * 코인 충전 처리 (결제 성공 후 호출)
   * @param user_idx 사용자 ID
   * @param processDto 충전 처리 데이터
   * @param tx 트랜잭션 클라이언트 (선택사항, 없으면 자체 트랜잭션 생성)
   * @returns 처리된 충전 내역
   */
  async processTopup(
    user_idx: number,
    processDto: ProcessTopupDto,
    tx?: Prisma.TransactionClient,
  ) {
    // 트랜잭션이 전달되면 그대로 사용, 없으면 새로 생성
    if (tx) {
      return await this._processTopupLogic(user_idx, processDto, tx);
    }

    return await this.prismaService.$transaction(async (tx) => {
      return await this._processTopupLogic(user_idx, processDto, tx);
    });
  }

  /**
   * 충전 처리 내부 로직 (트랜잭션 내에서 실행)
   * @private
   */
  private async _processTopupLogic(
    user_idx: number,
    processDto: ProcessTopupDto,
    tx: Prisma.TransactionClient,
  ) {
    // 1. 결제 거래 확인 (트랜잭션 내에서)
    const paymentTransaction = await this.paymentTransactionService.findById(
      processDto.transaction_id,
      tx,
    );

    if (paymentTransaction.status !== PaymentTransactionStatus.SUCCESS) {
      throw new BadRequestException('결제가 완료되지 않은 거래입니다.');
    }

    if (paymentTransaction.user_idx !== user_idx) {
      throw new BadRequestException('본인의 결제 거래가 아닙니다.');
    }

    // 2. 이미 충전 처리된 거래인지 확인 (트랜잭션 내에서)
    const existingTopup = await this.coinTopupRepository.findByTransactionId(
      processDto.transaction_id,
      tx,
    );

    if (existingTopup) {
      throw new BadRequestException('이미 충전 처리된 거래입니다.');
    }

    // 3. 상품 정보 조회 (활성화된 상품만)
    const product = await this.productService.findActiveProduct(
      processDto.product_id,
    );

    // 4. 결제 금액과 상품 가격 일치 확인
    if (paymentTransaction.amount !== product.price) {
      throw new BadRequestException(
        '결제 금액과 상품 가격이 일치하지 않습니다.',
      );
    }

    // 5. 코인 충전 내역 생성
    const coinTopup = await this.coinTopupRepository.create(
      {
        transaction_id: processDto.transaction_id,
        user_idx,
        product_id: processDto.product_id,
        product_name: product.name,
        base_coins: product.base_coins,
        bonus_coins: product.bonus_coins,
        total_coins: product.total_coins,
        paid_amount: paymentTransaction.amount,
        coin_unit_price: paymentTransaction.amount / product.total_coins,
      },
      tx,
    );

    // 6. 충전 상태를 COMPLETED로 업데이트
    await this.coinTopupRepository.updateStatus(
      coinTopup.id,
      TopupStatus.COMPLETED,
      tx,
    );

    // 7. WalletBalance 업데이트
    await this.walletBalanceService.addCoinsFromTopup(
      user_idx,
      product.total_coins,
      tx,
    );

    return coinTopup;
  }

  /**
   * 충전 내역 조회
   * @param id 충전 내역 ID
   * @returns 충전 내역
   */
  async findById(id: string) {
    const topup = await this.coinTopupRepository.findById(id);
    if (!topup) {
      throw new NotFoundException('존재하지 않는 충전 내역입니다.');
    }
    return topup;
  }

  /**
   * 사용자의 충전 내역 목록 조회
   * @param user_idx 사용자 ID
   * @param limit 조회 제한 수
   * @returns 충전 내역 목록
   */
  async findByUserId(user_idx: number, limit: number = 20) {
    return await this.coinTopupRepository.findByUserId(user_idx, limit);
  }

  /**
   * 사용자의 사용 가능한 충전 내역 조회 (FIFO용)
   * @param user_idx 사용자 ID
   * @returns 사용 가능한 충전 내역
   */
  async getAvailableTopups(user_idx: number) {
    return await this.coinTopupRepository.findAvailableTopupsForUser(user_idx);
  }

  /**
   * 충전 통계 조회
   * @param user_idx 사용자 ID
   * @returns 충전 통계
   */
  async getTopupStats(user_idx: number) {
    return await this.coinTopupRepository.getTopupStats(user_idx);
  }

  /**
   * 충전 실패 처리
   * @param transaction_id 결제 거래 ID
   * @returns 실패 처리된 충전 내역
   */
  async failTopup(transaction_id: string) {
    const topup =
      await this.coinTopupRepository.findByTransactionId(transaction_id);

    if (!topup) {
      throw new NotFoundException('존재하지 않는 충전 내역입니다.');
    }

    if (topup.status !== TopupStatus.PENDING) {
      throw new BadRequestException('이미 처리된 충전 내역입니다.');
    }

    return await this.coinTopupRepository.updateStatus(
      topup.id,
      TopupStatus.FAILED,
    );
  }

  /**
   * 환불 처리
   * @param topup_id 충전 내역 ID
   * @returns 환불 처리된 충전 내역
   */
  async processRefund(topup_id: string) {
    return await this.prismaService.$transaction(async (tx) => {
      const topup = await this.findById(topup_id);

      if (topup.status !== TopupStatus.COMPLETED) {
        throw new BadRequestException('완료된 충전만 환불할 수 있습니다.');
      }

      // 사용된 코인이 있는지 확인 (CoinUsage 테이블 체크)
      const usedCoins =
        await this.coinUsageService.getUsedCoinsFromTopup(topup_id);

      if (usedCoins > 0) {
        throw new BadRequestException(
          `이미 ${usedCoins}개의 코인이 사용되어 환불할 수 없습니다.`,
        );
      }

      // 환불 상태로 업데이트
      await this.coinTopupRepository.updateStatus(
        topup_id,
        TopupStatus.REFUNDED,
        tx,
      );

      // WalletBalance에서 코인 차감 처리
      await this.walletBalanceService.refundCoins(
        topup.user_idx,
        topup.total_coins,
        tx,
      );

      return topup;
    });
  }
}
