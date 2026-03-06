import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { PaymentTransactionRepository } from './payment-transaction.repository';
import { BootpayTransactionRepository } from './bootpay-transaction.repository';
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
import { ConfigService } from '@nestjs/config';
import { ReceiptResponseParameters } from '@bootpay/backend-js';
import { IdentityVerificationService } from 'src/identity-verification/identity-verification.service';

type BootpaySyncFields = {
  bootpay_receipt_id?: string;
  bootpay_status?: number;
  bootpay_status_locale?: string;
  paid_at?: Date;
  payment_method?: string;
};

@Injectable()
export class PaymentTransactionService {
  private readonly logger = new Logger(PaymentTransactionService.name);

  constructor(
    private readonly paymentTransactionRepository: PaymentTransactionRepository,
    private readonly bootpayTransactionRepository: BootpayTransactionRepository,
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => CoinTopupService))
    private readonly coinTopupService: CoinTopupService,
    private readonly productService: ProductService,
    private readonly pgProviderFactory: PgProviderFactory,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly identityVerificationService: IdentityVerificationService,
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
    return await this.prismaService.$transaction(async (tx) => {
      const transaction =
        await this.paymentTransactionRepository.findByPgTransactionId(
          pg_transaction_id,
          tx,
        );

      if (!transaction) {
        throw new NotFoundException('존재하지 않는 결제 거래입니다.');
      }

      if (
        transaction.status !== PaymentTransactionStatus.PENDING &&
        transaction.status !== PaymentTransactionStatus.WAITING_DEPOSIT
      ) {
        throw new BadRequestException('이미 처리된 결제 거래입니다.');
      }

      const { bootpayFields } = await this.syncBootpayDataForTransaction(
        transaction,
        pg_response,
        tx,
      );

      return await this.paymentTransactionRepository.updateStatus(
        transaction.id,
        PaymentTransactionStatus.FAILED,
        pg_response,
        tx,
        bootpayFields,
      );
    });
  }

  /**
   * 결제 취소 처리
   * @param pg_transaction_id PG사 거래 ID
   * @param pg_response PG사 응답 데이터
   * @returns 취소 처리된 결제 거래
   */
  async cancelPayment(pg_transaction_id: string, pg_response?: any) {
    return await this.prismaService.$transaction(async (tx) => {
      const transaction =
        await this.paymentTransactionRepository.findByPgTransactionId(
          pg_transaction_id,
          tx,
        );

      if (!transaction) {
        throw new NotFoundException('존재하지 않는 결제 거래입니다.');
      }

      if (transaction.status === PaymentTransactionStatus.CANCELED) {
        throw new BadRequestException('이미 취소된 결제 거래입니다.');
      }

      const { bootpayFields } = await this.syncBootpayDataForTransaction(
        transaction,
        pg_response,
        tx,
      );

      return await this.paymentTransactionRepository.updateStatus(
        transaction.id,
        PaymentTransactionStatus.CANCELED,
        pg_response,
        tx,
        bootpayFields,
      );
    });
  }

  /**
   * 무통장입금 대기 상태 처리
   * - Bootpay status=5, 0/2/4 웹훅 처리
   */
  async markWaitingDepositPayment(
    pg_transaction_id: string,
    pg_response?: any,
  ) {
    return await this.prismaService.$transaction(async (tx) => {
      const transaction =
        await this.paymentTransactionRepository.findByPgTransactionId(
          pg_transaction_id,
          tx,
        );

      if (!transaction) {
        throw new NotFoundException('존재하지 않는 결제 거래입니다.');
      }

      if (transaction.status === PaymentTransactionStatus.WAITING_DEPOSIT) {
        return transaction;
      }

      if (transaction.status !== PaymentTransactionStatus.PENDING) {
        throw new BadRequestException(
          '대기 상태로 전환할 수 없는 결제 거래입니다.',
        );
      }

      const { bootpayFields } = await this.syncBootpayDataForTransaction(
        transaction,
        pg_response,
        tx,
      );

      return await this.paymentTransactionRepository.updateStatus(
        transaction.id,
        PaymentTransactionStatus.WAITING_DEPOSIT,
        pg_response,
        tx,
        bootpayFields,
      );
    });
  }

  /**
   * 결제 만료 처리
   * - 결제 만료 이벤트 웹훅 처리
   */
  async expirePayment(pg_transaction_id: string, pg_response?: any) {
    return await this.prismaService.$transaction(async (tx) => {
      const transaction =
        await this.paymentTransactionRepository.findByPgTransactionId(
          pg_transaction_id,
          tx,
        );

      if (!transaction) {
        throw new NotFoundException('존재하지 않는 결제 거래입니다.');
      }

      if (transaction.status === PaymentTransactionStatus.EXPIRED) {
        return transaction;
      }

      if (
        transaction.status !== PaymentTransactionStatus.PENDING &&
        transaction.status !== PaymentTransactionStatus.WAITING_DEPOSIT
      ) {
        throw new BadRequestException(
          '만료 상태로 전환할 수 없는 결제 거래입니다.',
        );
      }

      const { bootpayFields } = await this.syncBootpayDataForTransaction(
        transaction,
        pg_response,
        tx,
      );

      return await this.paymentTransactionRepository.updateStatus(
        transaction.id,
        PaymentTransactionStatus.EXPIRED,
        pg_response,
        tx,
        bootpayFields,
      );
    });
  }

  /**
   * 결제 준비
   * - PG Provider를 통한 결제 준비
   * - Mock: 즉시 승인 처리 + 충전 완료
   * - Real PG: 결제 창 정보 반환 (Webhook에서 승인 처리)
   * @param user_idx 사용자 ID
   * @param product_id 상품 ID
   * @param pg_provider PG사 (기본값: MOCK)
   * @returns Mock: 충전 완료 결과 / Real PG: 결제 창 정보
   */
  async preparePayment(
    user_idx: number,
    product_id: number,
    pg_provider: PgProvider = PgProvider.MOCK,
  ) {
    // 결제 차단 기준은 항상 사용자의 본인인증 완료 여부만 확인
    await this.identityVerificationService.assertPaymentEligible(user_idx);

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
    // payment_method는 결제 완료 후 웹훅에서 설정됨
    await this.paymentTransactionRepository.create(user_idx, {
      pg_provider,
      pg_transaction_id: paymentResponse.pg_transaction_id,
      amount: product.price,
      product_id: product_id,
    });

    // 6-1. Mock인 경우: 즉시 승인 처리 + 충전
    if (pg_provider === PgProvider.MOCK) {
      const result = await this.processSuccessfulPayment(
        paymentResponse.pg_transaction_id,
        product_id,
        paymentResponse.pg_data,
      );

      // 충전 완료 후 wallet 정보 조회
      const wallet = await this.prismaService.coinBalance.findUnique({
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
   * @deprecated preparePayment() 사용 권장
   */
  async purchaseProductWithMock(user_idx: number, product_id: number) {
    return await this.preparePayment(user_idx, product_id, PgProvider.MOCK);
  }

  /**
   * Bootpay 웹훅 데이터를 DB에 저장
   * - BootpayTransaction 및 BootpayCardData 테이블에 저장
   * @param receiptData Bootpay Receipt 응답 데이터
   * @param user_idx 사용자 ID
   * @param tx 트랜잭션 클라이언트
   * @returns 저장된 BootpayTransaction
   */
  private async saveBootpayData(
    receiptData: ReceiptResponseParameters,
    user_idx: number,
    tx: any,
  ) {
    const applicationId =
      this.configService.get<string>('BOOTPAY_APPLICATION_ID') ||
      '5b8f6a4d396fa665fdc2b5e7';

    // 1. BootpayTransaction 저장
    const bootpayTransactionDto =
      BootpayTransactionRepository.fromReceiptResponse(
        receiptData,
        user_idx,
        applicationId,
      );

    const bootpayTransaction =
      await this.bootpayTransactionRepository.createOrUpdate(
        bootpayTransactionDto,
        tx,
      );

    this.logger.log(
      `Bootpay transaction saved: ${bootpayTransaction.receipt_id}`,
    );

    // 2. 결제수단별 상세 데이터 저장
    if (receiptData.card_data) {
      const cardDataDto = BootpayTransactionRepository.fromCardData(
        receiptData.card_data,
        bootpayTransaction.id,
      );
      await this.bootpayTransactionRepository.createOrUpdateCardData(
        cardDataDto,
        tx,
      );
      this.logger.log(
        `Bootpay card data saved for transaction: ${bootpayTransaction.id}`,
      );
    }

    if (receiptData.vbank_data) {
      const vbankDataDto = BootpayTransactionRepository.fromVbankData(
        receiptData.vbank_data,
        bootpayTransaction.id,
      );
      await this.bootpayTransactionRepository.createOrUpdateVbankData(
        vbankDataDto,
        tx,
      );
      this.logger.log(
        `Bootpay vbank data saved for transaction: ${bootpayTransaction.id}`,
      );
    }

    // 간편결제인 경우 (method_origin_symbol 존재 시)
    if (receiptData.method_origin_symbol) {
      const easyDataDto = BootpayTransactionRepository.fromEasyData(
        receiptData,
        bootpayTransaction.id,
      );
      await this.bootpayTransactionRepository.createOrUpdateEasyData(
        easyDataDto,
        tx,
      );
      this.logger.log(
        `Bootpay easy data saved for transaction: ${bootpayTransaction.id}`,
      );
    }

    return bootpayTransaction;
  }

  /**
   * Receipt 데이터에서 PaymentTransaction 동기화 필드 추출
   */
  private extractBootpayFields(
    receiptData: ReceiptResponseParameters,
  ): BootpaySyncFields {
    const paidAt = receiptData.purchased_at
      ? new Date(receiptData.purchased_at)
      : undefined;

    return {
      bootpay_receipt_id: receiptData.receipt_id,
      bootpay_status: receiptData.status,
      bootpay_status_locale: receiptData.status_locale || undefined,
      paid_at: paidAt && !Number.isNaN(paidAt.getTime()) ? paidAt : undefined,
      payment_method: receiptData.method_symbol || undefined,
    };
  }

  /**
   * Bootpay 웹훅 데이터 동기화
   * - BootpayTransaction/세부 데이터 저장
   * - PaymentTransaction 동기화 필드 구성
   */
  private async syncBootpayDataForTransaction(
    transaction: { pg_provider: string; user_idx: number | null },
    pg_response: any,
    tx: any,
  ): Promise<{
    bootpayTransactionId?: string;
    bootpayFields?: BootpaySyncFields;
  }> {
    if (transaction.pg_provider !== PgProvider.BOOTPAY) {
      return {};
    }

    if (!pg_response || typeof pg_response !== 'object') {
      throw new BadRequestException(
        'Bootpay 결제 응답 데이터가 올바르지 않습니다.',
      );
    }

    const receiptData = pg_response as ReceiptResponseParameters;
    if (!receiptData.receipt_id) {
      throw new BadRequestException(
        'Bootpay 결제 응답에 receipt_id가 없어 처리할 수 없습니다.',
      );
    }

    if (transaction.user_idx === null || transaction.user_idx === undefined) {
      throw new BadRequestException('결제 사용자 정보가 없습니다.');
    }

    const bootpayTransaction = await this.saveBootpayData(
      receiptData,
      transaction.user_idx,
      tx,
    );

    return {
      bootpayTransactionId: bootpayTransaction.id,
      bootpayFields: this.extractBootpayFields(receiptData),
    };
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

      if (
        transaction.status !== PaymentTransactionStatus.PENDING &&
        transaction.status !== PaymentTransactionStatus.WAITING_DEPOSIT
      ) {
        throw new BadRequestException('이미 처리된 결제 거래입니다.');
      }

      // 2. Bootpay 상세 데이터 동기화 (실패 시 결제 중단)
      const { bootpayTransactionId, bootpayFields } =
        await this.syncBootpayDataForTransaction(transaction, pg_response, tx);

      // 3. 결제 승인 처리 (Bootpay 필드 동기화 포함)
      const approvedTransaction =
        await this.paymentTransactionRepository.updateStatus(
          transaction.id,
          PaymentTransactionStatus.SUCCESS,
          pg_response,
          tx,
          bootpayFields,
        );

      // 4. 충전 처리 위임 (CoinTopupService) - bootpay_transaction_id 연결 포함
      const topupResult = await this.coinTopupService.processTopup(
        approvedTransaction.user_idx!,
        {
          transaction_id: approvedTransaction.id,
          product_id,
          bootpay_transaction_id: bootpayTransactionId,
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
