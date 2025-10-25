import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PaymentTransactionRepository } from './payment-transaction.repository';
import {
  CreatePaymentTransactionDto,
  PgProvider,
} from './dto/create-payment-transaction.dto';
import { PaymentTransactionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CoinTopupService } from '../coin-topup/coin-topup.service';
import { ProductService } from '../product/product.service';
import { PgProviderFactory } from './pg-providers/pg-provider.factory';
import { UserService } from '../user/user.service';

@Injectable()
export class PaymentTransactionService {
  constructor(
    private readonly paymentTransactionRepository: PaymentTransactionRepository,
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => CoinTopupService))
    private readonly coinTopupService: CoinTopupService,
    private readonly productService: ProductService,
    private readonly pgProviderFactory: PgProviderFactory,
    private readonly userService: UserService,
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
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 결제 거래
   */
  async findById(id: string, tx?: any) {
    const transaction = await this.paymentTransactionRepository.findById(
      id,
      tx,
    );

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
   * 상품 구매 (결제 준비)
   * - PG Provider를 통한 결제 준비
   * - Mock: 즉시 승인 처리 + 충전 완료
   * - Real PG: 결제 창 정보 반환 (Webhook에서 승인 처리)
   * @param user_idx 사용자 ID
   * @param product_id 상품 ID
   * @param pg_provider PG사 (기본값: MOCK)
   * @returns Mock: 충전 완료 결과 / Real PG: 결제 창 정보
   */
  async purchaseProduct(
    user_idx: number,
    product_id: number,
    pg_provider: PgProvider = PgProvider.MOCK,
  ) {
    // 1. PG Provider 선택
    const provider = this.pgProviderFactory.getProvider(pg_provider);

    // 2. 상품 조회
    const product = await this.productService.findActiveProduct(product_id);

    // 3. 사용자 정보 조회 (PG사 요청에 필요)
    const user = await this.userService.findByUserIdx(user_idx);

    // 4. PG사에 결제 준비 요청
    const paymentResponse = await provider.preparePayment({
      product_id,
      amount: product.price,
      user_idx,
      product_name: product.name,
      user_info: {
        user_id: user.user_id,
        nickname: user.nickname,
      },
    });

    // 5. DB에 거래 생성 (PENDING)
    await this.paymentTransactionRepository.create(user_idx, {
      pg_provider,
      pg_transaction_id: paymentResponse.pg_transaction_id,
      payment_method: 'card' as any, // 기본값
      amount: product.price,
    });

    // 6-1. Mock인 경우: 즉시 승인 처리 + 충전
    if (pg_provider === PgProvider.MOCK) {
      const result = await this.processSuccessfulPayment(
        paymentResponse.pg_transaction_id,
        product_id,
        paymentResponse.pg_data,
      );

      // 충전 완료 후 wallet 정보 조회
      const wallet = await this.prismaService.walletBalance.findUnique({
        where: { user_idx },
      });

      return {
        success: true,
        message: '충전이 완료되었습니다.',
        data: {
          topup: result.data.topup,
          product: {
            id: product.id,
            name: product.name,
            total_coins: product.total_coins,
          },
          wallet: wallet || { coin_balance: 0 },
        },
      };
    }

    // 6-2. Real PG인 경우: 프론트에 결제 창 정보 반환
    return {
      success: true,
      message: '결제 준비 완료',
      data: {
        pg_provider,
        pg_transaction_id: paymentResponse.pg_transaction_id,
        redirect_url: paymentResponse.redirect_url,
        app_scheme: paymentResponse.app_scheme,
        pg_data: paymentResponse.pg_data,
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          total_coins: product.total_coins,
        },
      },
    };
  }

  /**
   * Mock 상품 구매 (하위 호환성 유지)
   * - 기존 코드와의 호환성을 위해 유지
   * @deprecated purchaseProduct() 사용 권장
   */
  async purchaseProductWithMock(user_idx: number, product_id: number) {
    return await this.purchaseProduct(user_idx, product_id, PgProvider.MOCK);
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
      // 1. 결제 거래 조회 (트랜잭션 내에서)
      const transaction =
        await this.paymentTransactionRepository.findByPgTransactionId(
          pg_transaction_id,
          tx,
        );

      if (!transaction) {
        throw new NotFoundException('존재하지 않는 결제 거래입니다.');
      }

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
