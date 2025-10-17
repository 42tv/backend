import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentTransactionRepository } from './payment-transaction.repository';
import { CreatePaymentTransactionDto } from './dto/create-payment-transaction.dto';
import { PaymentTransactionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CoinTopupService } from '../coin-topup/coin-topup.service';
import { ProductService } from '../product/product.service';

@Injectable()
export class PaymentTransactionService {
  constructor(
    private readonly paymentTransactionRepository: PaymentTransactionRepository,
    private readonly prismaService: PrismaService,
    private readonly coinTopupService: CoinTopupService,
    private readonly productService: ProductService,
  ) {}

  /**
   * 결제 거래 생성
   * @param user_idx 결제자 ID
   * @param createDto 결제 거래 생성 데이터
   * @returns 생성된 결제 거래
   */
  async create(user_idx: number, createDto: CreatePaymentTransactionDto) {
    // PG 거래 ID 중복 확인
    const existingTransaction =
      await this.paymentTransactionRepository.findByPgTransactionId(
        createDto.pg_transaction_id,
      );

    if (existingTransaction) {
      throw new BadRequestException('이미 존재하는 PG 거래 ID입니다.');
    }

    return await this.paymentTransactionRepository.create(user_idx, createDto);
  }

  /**
   * PG사 거래 ID로 결제 거래 조회
   * @param pg_transaction_id PG사 거래 고유번호
   * @returns 결제 거래
   */
  async findByPgTransactionId(pg_transaction_id: string) {
    const transaction =
      await this.paymentTransactionRepository.findByPgTransactionId(
        pg_transaction_id,
      );

    if (!transaction) {
      throw new NotFoundException('존재하지 않는 결제 거래입니다.');
    }

    return transaction;
  }

  /**
   * 결제 거래 조회
   * @param id 결제 거래 ID
   * @returns 결제 거래
   */
  async findById(id: string) {
    const transaction = await this.paymentTransactionRepository.findById(id);

    if (!transaction) {
      throw new NotFoundException('존재하지 않는 결제 거래입니다.');
    }

    return transaction;
  }

  /**
   * 사용자의 결제 거래 목록 조회
   * @param user_idx 사용자 ID
   * @param limit 조회 제한 수
   * @returns 결제 거래 목록
   */
  async findByUserId(user_idx: number, limit: number = 20) {
    return await this.paymentTransactionRepository.findByUserId(
      user_idx,
      limit,
    );
  }

  /**
   * 결제 승인 처리
   * @param pg_transaction_id PG사 거래 ID
   * @param pg_response PG사 응답 데이터
   * @returns 승인된 결제 거래
   */
  async approvePayment(pg_transaction_id: string, pg_response?: any) {
    const transaction = await this.findByPgTransactionId(pg_transaction_id);

    if (transaction.status !== PaymentTransactionStatus.PENDING) {
      throw new BadRequestException('이미 처리된 결제 거래입니다.');
    }

    return await this.paymentTransactionRepository.updateStatus(
      transaction.id,
      PaymentTransactionStatus.SUCCESS,
      pg_response,
    );
  }

  /**
   * 결제 실패 처리
   * @param pg_transaction_id PG사 거래 ID
   * @param pg_response PG사 응답 데이터
   * @returns 실패 처리된 결제 거래
   */
  async failPayment(pg_transaction_id: string, pg_response?: any) {
    const transaction = await this.findByPgTransactionId(pg_transaction_id);

    if (transaction.status !== PaymentTransactionStatus.PENDING) {
      throw new BadRequestException('이미 처리된 결제 거래입니다.');
    }

    return await this.paymentTransactionRepository.updateStatus(
      transaction.id,
      PaymentTransactionStatus.FAILED,
      pg_response,
    );
  }

  /**
   * 결제 취소 처리
   * @param pg_transaction_id PG사 거래 ID
   * @param pg_response PG사 응답 데이터
   * @returns 취소 처리된 결제 거래
   */
  async cancelPayment(pg_transaction_id: string, pg_response?: any) {
    const transaction = await this.findByPgTransactionId(pg_transaction_id);

    if (transaction.status === PaymentTransactionStatus.CANCELED) {
      throw new BadRequestException('이미 취소된 결제 거래입니다.');
    }

    return await this.paymentTransactionRepository.updateStatus(
      transaction.id,
      PaymentTransactionStatus.CANCELED,
      pg_response,
    );
  }

  /**
   * Mock 상품 구매 (결제 + 충전 통합)
   * - 개발/테스트용: 실제 PG 연동 없이 즉시 처리
   * @param user_idx 사용자 ID
   * @param product_id 상품 ID
   * @returns 충전 완료 결과
   */
  async purchaseProductWithMock(user_idx: number, product_id: number) {
    return await this.prismaService.$transaction(async (tx) => {
      // 1. 상품 조회
      const product = await this.productService.findActiveProduct(product_id);

      // 2. Mock PG 거래 ID 생성
      const mockPgTransactionId = `MOCK_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // 3. 결제 거래 생성 (PENDING)
      await this.paymentTransactionRepository.create(
        user_idx,
        {
          pg_provider: 'mock' as any,
          pg_transaction_id: mockPgTransactionId,
          payment_method: 'mock' as any,
          amount: product.price,
        },
        tx,
      );

      // 4. 즉시 승인 처리 (Mock)
      const approvedTransaction =
        await this.paymentTransactionRepository.updateStatus(
          (await this.paymentTransactionRepository.findByPgTransactionId(
            mockPgTransactionId,
          ))!.id,
          PaymentTransactionStatus.SUCCESS,
          {
            mock: true,
            timestamp: new Date().toISOString(),
            message: 'Mock payment for development/testing',
          },
          tx,
        );

      // 5. 충전 처리 위임 (CoinTopupService) - 트랜잭션 전달
      const topupResult = await this.coinTopupService.processTopup(
        user_idx,
        {
          transaction_id: approvedTransaction.id,
          product_id: product.id,
        },
        tx,
      );

      return {
        success: true,
        message: '충전이 완료되었습니다.',
        data: {
          topup: topupResult,
          product: {
            id: product.id,
            name: product.name,
            total_coins: product.total_coins,
          },
        },
      };
    });
  }

  /**
   * Webhook: 결제 성공 및 코인 충전 처리
   * - 실제 PG 연동 시 사용 (Webhook에서 호출)
   * @param pg_transaction_id PG사 거래 ID
   * @param product_id 상품 ID
   * @param pg_response PG사 응답 데이터
   * @returns 처리 결과
   */
  async processSuccessfulPayment(
    pg_transaction_id: string,
    product_id: number,
    pg_response?: any,
  ) {
    return await this.prismaService.$transaction(async (tx) => {
      // 1. 결제 거래 조회
      const transaction = await this.findByPgTransactionId(pg_transaction_id);

      if (transaction.status !== PaymentTransactionStatus.PENDING) {
        throw new BadRequestException('이미 처리된 결제 거래입니다.');
      }

      // 2. 결제 승인 처리
      const approvedTransaction =
        await this.paymentTransactionRepository.updateStatus(
          transaction.id,
          PaymentTransactionStatus.SUCCESS,
          pg_response,
          tx,
        );

      // 3. 충전 처리 위임 (CoinTopupService) - 트랜잭션 전달
      const topupResult = await this.coinTopupService.processTopup(
        approvedTransaction.user_idx!,
        {
          transaction_id: approvedTransaction.id,
          product_id,
        },
        tx,
      );

      return {
        success: true,
        message: '결제 및 충전이 완료되었습니다.',
        data: {
          transaction: approvedTransaction,
          topup: topupResult,
        },
      };
    });
  }
}
