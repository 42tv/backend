import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentTransactionController } from './payment-transaction.controller';
import { PaymentTransactionService } from './payment-transaction.service';
import { PgProviderFactory } from './pg-providers/pg-provider.factory';
import { RedisService } from '../redis/redis.service';

describe('PaymentTransactionController', () => {
  let controller: PaymentTransactionController;
  let paymentTransactionService: jest.Mocked<PaymentTransactionService>;
  let pgProviderFactory: jest.Mocked<PgProviderFactory>;
  let redisService: jest.Mocked<RedisService>;

  const mockProvider = {
    verifyWebhook: jest.fn(),
    parseWebhookData: jest.fn(),
    preparePayment: jest.fn(),
    cancelPayment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentTransactionController],
      providers: [
        {
          provide: PaymentTransactionService,
          useValue: {
            findByPgTransactionId: jest.fn(),
            processSuccessfulPayment: jest.fn(),
            failPayment: jest.fn(),
            cancelPayment: jest.fn(),
            create: jest.fn(),
            findById: jest.fn(),
            findByUserId: jest.fn(),
            approvePayment: jest.fn(),
            preparePayment: jest.fn(),
          },
        },
        {
          provide: PgProviderFactory,
          useValue: {
            getProvider: jest.fn().mockReturnValue(mockProvider),
          },
        },
        {
          provide: RedisService,
          useValue: {
            acquireLock: jest.fn().mockResolvedValue(true),
            releaseLock: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentTransactionController>(
      PaymentTransactionController,
    );
    paymentTransactionService = module.get(PaymentTransactionService);
    pgProviderFactory = module.get(PgProviderFactory);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleWebhook', () => {
    const mockBody = { receipt_id: 'test_receipt_123' };

    describe('PG Provider 검증', () => {
      it('지원하지 않는 PG사면 에러 응답을 반환해야 한다', async () => {
        const result = await controller.handleWebhook(
          'unsupported_pg',
          mockBody,
        );

        expect(result).toEqual({
          success: false,
          error_code: 'UNSUPPORTED_PG_PROVIDER',
          error: '지원하지 않는 PG사입니다: unsupported_pg',
        });
      });
    });

    describe('Webhook 서명 검증', () => {
      it('서명 검증 실패 시 에러 응답을 반환해야 한다', async () => {
        mockProvider.verifyWebhook.mockResolvedValue(false);

        const result = await controller.handleWebhook('bootpay', mockBody);

        expect(result).toEqual({
          success: false,
          error_code: 'WEBHOOK_VERIFICATION_FAILED',
          error: 'Webhook 서명 검증 또는 데이터 파싱에 실패했습니다',
        });
      });
    });

    describe('결제 성공 Webhook', () => {
      const successWebhookData = {
        pg_transaction_id: 'ORDER_123',
        status: 'success' as const,
        amount: 10000,
        pg_response: { status: 1 },
      };

      beforeEach(() => {
        mockProvider.verifyWebhook.mockResolvedValue(true);
        mockProvider.parseWebhookData.mockResolvedValue(successWebhookData);
      });

      it('결제 성공 시 processSuccessfulPayment을 호출해야 한다', async () => {
        paymentTransactionService.findByPgTransactionId.mockResolvedValue({
          id: 'txn_1',
          product_id: 1,
          amount: 10000,
          status: 'PENDING',
          user_idx: 1,
          pg_provider: 'bootpay',
          pg_transaction_id: 'ORDER_123',
        } as any);
        paymentTransactionService.processSuccessfulPayment.mockResolvedValue({
          success: true,
        } as any);

        const result = await controller.handleWebhook('bootpay', mockBody);

        expect(result).toEqual({ success: true });
        expect(
          paymentTransactionService.processSuccessfulPayment,
        ).toHaveBeenCalledWith('ORDER_123', 1, { status: 1 });
      });

      it('금액 불일치 시 에러 응답을 반환해야 한다', async () => {
        paymentTransactionService.findByPgTransactionId.mockResolvedValue({
          id: 'txn_1',
          product_id: 1,
          amount: 5000, // 불일치
          status: 'PENDING',
        } as any);

        const result = await controller.handleWebhook('bootpay', mockBody);

        expect(result.success).toBe(false);
        expect(result.error_code).toBe('WEBHOOK_PROCESSING_ERROR');
      });

      it('product_id 누락 시 에러 응답을 반환해야 한다', async () => {
        paymentTransactionService.findByPgTransactionId.mockResolvedValue({
          id: 'txn_1',
          product_id: null,
          amount: 10000,
          status: 'PENDING',
        } as any);

        const result = await controller.handleWebhook('bootpay', mockBody);

        expect(result.success).toBe(false);
        expect(result.error_code).toBe('WEBHOOK_PROCESSING_ERROR');
      });
    });

    describe('결제 실패 Webhook', () => {
      it('결제 실패 시 failPayment을 호출해야 한다', async () => {
        mockProvider.verifyWebhook.mockResolvedValue(true);
        mockProvider.parseWebhookData.mockResolvedValue({
          pg_transaction_id: 'ORDER_123',
          status: 'failed',
          amount: 10000,
          pg_response: { status: 3 },
        });
        paymentTransactionService.failPayment.mockResolvedValue({} as any);

        const result = await controller.handleWebhook('bootpay', mockBody);

        expect(result).toEqual({ success: true });
        expect(paymentTransactionService.failPayment).toHaveBeenCalledWith(
          'ORDER_123',
          { status: 3 },
        );
      });
    });

    describe('결제 취소 Webhook', () => {
      it('결제 취소 시 cancelPayment을 호출해야 한다', async () => {
        mockProvider.verifyWebhook.mockResolvedValue(true);
        mockProvider.parseWebhookData.mockResolvedValue({
          pg_transaction_id: 'ORDER_123',
          status: 'canceled',
          amount: 10000,
          pg_response: { status: 20 },
        });
        paymentTransactionService.cancelPayment.mockResolvedValue({} as any);

        const result = await controller.handleWebhook('bootpay', mockBody);

        expect(result).toEqual({ success: true });
        expect(paymentTransactionService.cancelPayment).toHaveBeenCalledWith(
          'ORDER_123',
          { status: 20 },
        );
      });
    });

    describe('결제 부분 취소 Webhook', () => {
      it('부분 취소 시 상태 전이 없이 정상 응답해야 한다', async () => {
        mockProvider.verifyWebhook.mockResolvedValue(true);
        mockProvider.parseWebhookData.mockResolvedValue({
          pg_transaction_id: 'ORDER_123',
          status: 'partial_canceled',
          amount: 10000,
          pg_response: {
            status: 1,
            webhook_type: 'PAYMENT_PARTIAL_CANCELLED',
            cancelled_price: 1000,
          },
        });

        const result = await controller.handleWebhook('bootpay', mockBody);

        expect(result).toEqual({ success: true });
        expect(
          paymentTransactionService.processSuccessfulPayment,
        ).not.toHaveBeenCalled();
        expect(paymentTransactionService.cancelPayment).not.toHaveBeenCalled();
      });
    });

    describe('멱등성 (중복 처리 방지)', () => {
      it('락 획득 실패 시 중복 처리를 건너뛰어야 한다', async () => {
        mockProvider.verifyWebhook.mockResolvedValue(true);
        mockProvider.parseWebhookData.mockResolvedValue({
          pg_transaction_id: 'ORDER_123',
          status: 'success',
          amount: 10000,
          pg_response: {},
        });
        redisService.acquireLock.mockResolvedValue(false); // 락 획득 실패

        const result = await controller.handleWebhook('bootpay', mockBody);

        expect(result).toEqual({ success: true });
        // processSuccessfulPayment이 호출되지 않아야 함
        expect(
          paymentTransactionService.processSuccessfulPayment,
        ).not.toHaveBeenCalled();
      });

      it('처리 완료 후 락이 해제되어야 한다', async () => {
        mockProvider.verifyWebhook.mockResolvedValue(true);
        mockProvider.parseWebhookData.mockResolvedValue({
          pg_transaction_id: 'ORDER_123',
          status: 'failed',
          amount: 10000,
          pg_response: {},
        });
        redisService.acquireLock.mockResolvedValue(true);
        paymentTransactionService.failPayment.mockResolvedValue({} as any);

        await controller.handleWebhook('bootpay', mockBody);

        expect(redisService.acquireLock).toHaveBeenCalledWith(
          'webhook:ORDER_123',
          60,
        );
        expect(redisService.releaseLock).toHaveBeenCalledWith(
          'webhook:ORDER_123',
        );
      });
    });

    describe('에러 처리', () => {
      it('일시적 에러 시 WEBHOOK_TEMPORARY_ERROR를 반환해야 한다', async () => {
        mockProvider.verifyWebhook.mockResolvedValue(true);
        mockProvider.parseWebhookData.mockResolvedValue({
          pg_transaction_id: 'ORDER_123',
          status: 'success',
          amount: 10000,
          pg_response: {},
        });

        const prismaError = new Error('Connection pool timeout');
        (prismaError as any).code = 'P2024';
        paymentTransactionService.findByPgTransactionId.mockRejectedValue(
          prismaError,
        );

        const result = await controller.handleWebhook('bootpay', mockBody);

        expect(result.success).toBe(false);
        expect(result.error_code).toBe('WEBHOOK_TEMPORARY_ERROR');
      });

      it('영구 에러 시 WEBHOOK_PROCESSING_ERROR를 반환해야 한다', async () => {
        mockProvider.verifyWebhook.mockResolvedValue(true);
        mockProvider.parseWebhookData.mockResolvedValue({
          pg_transaction_id: 'ORDER_123',
          status: 'success',
          amount: 10000,
          pg_response: {},
        });
        paymentTransactionService.findByPgTransactionId.mockRejectedValue(
          new NotFoundException('존재하지 않는 결제 거래입니다.'),
        );

        const result = await controller.handleWebhook('bootpay', mockBody);

        expect(result.success).toBe(false);
        expect(result.error_code).toBe('WEBHOOK_PROCESSING_ERROR');
      });
    });
  });
});
