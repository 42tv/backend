import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  PaymentTransactionStatus,
  RefundRequestStatus,
  TopupStatus,
} from '@prisma/client';
import { CoinTopupService } from './coin-topup.service';
import { CoinTopupRepository } from './coin-topup.repository';
import { ProductService } from '../product/product.service';
import { PaymentTransactionService } from '../payment/payment-transaction.service';
import { CoinBalanceService } from '../coin-balance/coin-balance.service';
import { PrismaService } from '../prisma/prisma.service';
import { PayoutCoinService } from '../payout-coin/payout-coin.service';
import { BootpayService } from '../bootpay/bootpay.service';
import { AdminAuditLogService } from '../admin-audit-log/admin-audit-log.service';

describe('CoinTopupService', () => {
  let service: CoinTopupService;
  let coinTopupRepository: jest.Mocked<CoinTopupRepository>;
  let paymentTransactionService: jest.Mocked<PaymentTransactionService>;
  let coinBalanceService: jest.Mocked<CoinBalanceService>;
  let bootpayService: jest.Mocked<BootpayService>;
  let auditLogService: jest.Mocked<AdminAuditLogService>;

  const mockTx = {} as any;

  const processDto = {
    transaction_id: 'tx1',
    bootpay_transaction_id: undefined,
    product_id: 3,
  } as any;

  const mockProduct = {
    name: '코인 1100개',
    price: 11000,
    base_coins: 1000,
    bonus_coins: 100,
    total_coins: 1100,
  };

  const basePaymentTransaction = {
    status: PaymentTransactionStatus.SUCCESS,
    user_idx: 1,
    amount: 11000,
    user: { idx: 1, user_id: 'tester', nickname: '테스터' },
    user_snapshot: { user_idx: 1, user_id: 'tester', nickname: '테스터' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoinTopupService,
        {
          provide: CoinTopupRepository,
          useValue: {
            create: jest.fn().mockResolvedValue({ id: 't1' }),
            findByTransactionId: jest.fn().mockResolvedValue(null),
            findById: jest.fn(),
            updateStatus: jest.fn(),
            markRefunded: jest.fn(),
            getAdminStats: jest.fn(),
            lockTopupForRefund: jest.fn().mockResolvedValue(true),
            createRefundRequest: jest.fn(),
            findRefundRequestById: jest.fn(),
            updateRefundRequest: jest.fn(),
            findRefundRequestsByUser: jest.fn(),
            findRefundRequestsForAdmin: jest.fn(),
          },
        },
        {
          provide: ProductService,
          useValue: {
            findActiveProduct: jest.fn().mockResolvedValue(mockProduct),
          },
        },
        {
          provide: PaymentTransactionService,
          useValue: { findById: jest.fn() },
        },
        {
          provide: CoinBalanceService,
          useValue: { addCoinsFromTopup: jest.fn(), refundCoins: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: { $transaction: jest.fn((cb: any) => cb(mockTx)) },
        },
        {
          provide: PayoutCoinService,
          useValue: {},
        },
        {
          provide: BootpayService,
          useValue: {
            cancelPayment: jest.fn().mockResolvedValue({ success: true }),
          },
        },
        {
          provide: AdminAuditLogService,
          useValue: { record: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(CoinTopupService);
    coinTopupRepository = module.get(CoinTopupRepository);
    paymentTransactionService = module.get(PaymentTransactionService);
    coinBalanceService = module.get(CoinBalanceService);
    bootpayService = module.get(BootpayService);
    auditLogService = module.get(AdminAuditLogService);
  });

  it('충전 생성 시 결제 거래의 사용자로 스냅샷을 기록한다', async () => {
    paymentTransactionService.findById.mockResolvedValue(
      basePaymentTransaction as any,
    );

    await service.processTopup(1, processDto, mockTx);

    expect(coinTopupRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_idx: 1,
        user_snapshot: { user_idx: 1, user_id: 'tester', nickname: '테스터' },
      }),
      mockTx,
    );
  });

  it('결제 거래에 user가 없으면 저장된 스냅샷으로 폴백한다', async () => {
    paymentTransactionService.findById.mockResolvedValue({
      ...basePaymentTransaction,
      user: null,
      user_snapshot: { user_idx: 1, user_id: 'old_id', nickname: '옛닉네임' },
    } as any);

    await service.processTopup(1, processDto, mockTx);

    expect(coinTopupRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_snapshot: { user_idx: 1, user_id: 'old_id', nickname: '옛닉네임' },
      }),
      mockTx,
    );
  });

  describe('processRefund (부분 환불)', () => {
    const baseTopup = {
      id: 'topup1',
      user_idx: 1,
      status: TopupStatus.COMPLETED,
      base_coins: 1000,
      bonus_coins: 100,
      total_coins: 1100,
      remaining_coins: 1100,
      paid_amount: 11000,
      coin_unit_price: 11000 / 1100, // 10
      transaction: { bootpay_receipt_id: 'receipt1' },
    };

    it('전액 잔여 시 Bootpay 전체 취소 후 전액 환불한다', async () => {
      coinTopupRepository.findById.mockResolvedValue(baseTopup as any);

      const result = await service.processRefund('topup1', 99, '고객 요청');

      // 전액 잔여면 cancel_price 없이 전체 취소
      expect(bootpayService.cancelPayment).toHaveBeenCalledWith(
        'receipt1',
        undefined,
        'Admin',
        '고객 요청',
        'refund_topup1',
      );
      expect(coinTopupRepository.markRefunded).toHaveBeenCalledWith(
        'topup1',
        1100,
        11000,
        mockTx,
      );
      expect(coinBalanceService.refundCoins).toHaveBeenCalledWith(
        1,
        1100,
        mockTx,
      );
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          adminIdx: 99,
          action: 'TOPUP_REFUND',
          targetId: 'topup1',
          reason: '고객 요청',
        }),
        mockTx,
      );
      expect(result).toEqual({
        topup_id: 'topup1',
        refunded_coins: 1100,
        refunded_amount: 11000,
        status: TopupStatus.REFUNDED,
      });
    });

    it('일부 사용 시 잔여 코인만큼 Bootpay 부분 취소한다', async () => {
      coinTopupRepository.findById.mockResolvedValue({
        ...baseTopup,
        remaining_coins: 500,
      } as any);

      const result = await service.processRefund('topup1', 99, '고객 요청');

      // 500코인 × 10원 = 5,000원 부분 취소
      expect(bootpayService.cancelPayment).toHaveBeenCalledWith(
        'receipt1',
        5000,
        'Admin',
        '고객 요청',
        'refund_topup1',
      );
      expect(coinTopupRepository.markRefunded).toHaveBeenCalledWith(
        'topup1',
        500,
        5000,
        mockTx,
      );
      expect(coinBalanceService.refundCoins).toHaveBeenCalledWith(
        1,
        500,
        mockTx,
      );
      expect(result).toEqual({
        topup_id: 'topup1',
        refunded_coins: 500,
        refunded_amount: 5000,
        status: TopupStatus.REFUNDED,
      });
    });

    it('부분 사용 후 환불 시 잔여 코인분만 환불액으로 저장하고 순매출 기준을 유지한다', async () => {
      // 10,000원 / 100코인 충전 (단가 100원), 33코인 사용 후 67코인 환불
      coinTopupRepository.findById.mockResolvedValue({
        ...baseTopup,
        base_coins: 100,
        bonus_coins: 0,
        total_coins: 100,
        remaining_coins: 67,
        paid_amount: 10000,
        coin_unit_price: 10000 / 100, // 100
      } as any);

      const result = await service.processRefund('topup1', 99, '고객 요청');

      // 환불액은 67코인 × 100원 = 6,700원 (paid_amount 전체가 아님)
      expect(coinTopupRepository.markRefunded).toHaveBeenCalledWith(
        'topup1',
        67,
        6700,
        mockTx,
      );
      expect(result.refunded_amount).toBe(6700);

      // 통계: refunded_amount 컬럼 집계 기준으로 순매출 = 10,000 - 6,700 = 3,300
      (coinTopupRepository.getAdminStats as jest.Mock).mockResolvedValue({
        topupGroups: [
          {
            status: TopupStatus.REFUNDED,
            _sum: {
              paid_amount: 10000,
              total_coins: 100,
              remaining_coins: 0,
              refunded_coins: 67,
              refunded_amount: 6700,
            },
            _count: { _all: 1 },
          },
        ],
        payoutGroups: [],
        settlementGroups: [],
      });

      const stats = await service.getAdminPaymentStats();

      expect(stats.payments.refunded_amount).toBe(6700);
      expect(
        stats.payments.total_paid_amount - stats.payments.refunded_amount,
      ).toBe(3300);
    });

    it('전량 사용 시 환불을 거부한다', async () => {
      coinTopupRepository.findById.mockResolvedValue({
        ...baseTopup,
        remaining_coins: 0,
      } as any);

      await expect(
        service.processRefund('topup1', 99, '고객 요청'),
      ).rejects.toThrow(BadRequestException);

      expect(bootpayService.cancelPayment).not.toHaveBeenCalled();
      expect(coinTopupRepository.markRefunded).not.toHaveBeenCalled();
    });

    it('환불된 충전 건의 사용분을 코인 통계에 포함한다', async () => {
      // 완료 1건(1100충전/500사용/600잔여) + 환불 1건(100충전/33사용/67환불)
      (coinTopupRepository.getAdminStats as jest.Mock).mockResolvedValue({
        topupGroups: [
          {
            status: TopupStatus.COMPLETED,
            _sum: {
              paid_amount: 11000,
              total_coins: 1100,
              remaining_coins: 600,
              refunded_coins: 0,
            },
            _count: { _all: 1 },
          },
          {
            status: TopupStatus.REFUNDED,
            _sum: {
              paid_amount: 1000,
              total_coins: 100,
              remaining_coins: 0,
              refunded_coins: 67,
            },
            _count: { _all: 1 },
          },
        ],
        payoutGroups: [],
        settlementGroups: [],
      });

      const stats = await service.getAdminPaymentStats();

      expect(stats.coins).toEqual({
        total_charged_coins: 1200,
        total_used_coins: 533, // 500(완료) + 33(환불 건에서 사용)
        total_remaining_coins: 600,
        total_refunded_coins: 67,
      });
    });

    it('이미 환불된 충전에 대한 중복 요청을 거부한다', async () => {
      coinTopupRepository.findById.mockResolvedValue({
        ...baseTopup,
        status: TopupStatus.REFUNDED,
        remaining_coins: 0,
      } as any);

      await expect(
        service.processRefund('topup1', 99, '고객 요청'),
      ).rejects.toThrow('이미 환불 처리된 충전입니다.');

      expect(bootpayService.cancelPayment).not.toHaveBeenCalled();
      expect(coinTopupRepository.markRefunded).not.toHaveBeenCalled();
      expect(coinBalanceService.refundCoins).not.toHaveBeenCalled();
    });
  });

  describe('환불 요청 승인 플로우 (사용자 청약철회)', () => {
    // topped_up_at은 KST naive timestamp로 저장됨 — 현재 시각을 동일 표현으로 보정
    const kstNow = () => new Date(Date.now() + 9 * 60 * 60 * 1000);
    const daysAgo = (days: number) =>
      new Date(kstNow().getTime() - days * 24 * 60 * 60 * 1000);

    const baseTopup = {
      id: 'topup1',
      user_idx: 1,
      status: TopupStatus.COMPLETED,
      base_coins: 1000,
      bonus_coins: 100,
      total_coins: 1100,
      remaining_coins: 1100,
      paid_amount: 11000,
      coin_unit_price: 11000 / 1100,
      topped_up_at: daysAgo(1),
      transaction: { bootpay_receipt_id: 'receipt1' },
    };

    const basePendingRequest = {
      id: 'req1',
      topup_id: 'topup1',
      user_idx: 1,
      status: RefundRequestStatus.PENDING,
      remaining_coins: 1100,
      expected_amount: 11000,
    };

    describe('createRefundRequest (접수)', () => {
      it('7일 이내 본인 충전 건은 잠금 후 승인 대기로 접수된다', async () => {
        coinTopupRepository.findById.mockResolvedValue(baseTopup as any);
        (
          coinTopupRepository.createRefundRequest as jest.Mock
        ).mockResolvedValue(basePendingRequest);

        const result = await service.createRefundRequest(
          'topup1',
          1,
          '단순 변심',
        );

        // 즉시 환불하지 않는다
        expect(bootpayService.cancelPayment).not.toHaveBeenCalled();
        expect(coinTopupRepository.markRefunded).not.toHaveBeenCalled();

        expect(coinTopupRepository.lockTopupForRefund).toHaveBeenCalledWith(
          'topup1',
          mockTx,
        );
        expect(coinTopupRepository.createRefundRequest).toHaveBeenCalledWith(
          {
            topup_id: 'topup1',
            user_idx: 1,
            remaining_coins: 1100,
            expected_amount: 11000,
            user_reason: '단순 변심',
          },
          mockTx,
        );
        expect(result).toEqual(basePendingRequest);
      });

      it('이미 환불이 진행 중인 충전은 접수를 거부한다', async () => {
        coinTopupRepository.findById.mockResolvedValue(baseTopup as any);
        (coinTopupRepository.lockTopupForRefund as jest.Mock).mockResolvedValue(
          false,
        );

        await expect(service.createRefundRequest('topup1', 1)).rejects.toThrow(
          '이미 환불이 진행 중인 충전입니다.',
        );
        expect(coinTopupRepository.createRefundRequest).not.toHaveBeenCalled();
      });

      it('타인의 충전 건은 접수할 수 없다', async () => {
        coinTopupRepository.findById.mockResolvedValue(baseTopup as any);

        await expect(service.createRefundRequest('topup1', 2)).rejects.toThrow(
          NotFoundException,
        );
        expect(coinTopupRepository.lockTopupForRefund).not.toHaveBeenCalled();
      });

      it('결제일로부터 7일이 지나면 접수를 거부한다', async () => {
        coinTopupRepository.findById.mockResolvedValue({
          ...baseTopup,
          topped_up_at: daysAgo(8),
        } as any);

        await expect(service.createRefundRequest('topup1', 1)).rejects.toThrow(
          '청약철회 기간(결제일로부터 7일)이 지났습니다. 고객센터로 문의해주세요.',
        );
        expect(coinTopupRepository.lockTopupForRefund).not.toHaveBeenCalled();
      });

      it('전량 사용된 충전 건은 접수를 거부한다', async () => {
        coinTopupRepository.findById.mockResolvedValue({
          ...baseTopup,
          remaining_coins: 0,
        } as any);

        await expect(service.createRefundRequest('topup1', 1)).rejects.toThrow(
          BadRequestException,
        );
        expect(coinTopupRepository.lockTopupForRefund).not.toHaveBeenCalled();
      });
    });

    describe('cancelRefundRequest (사용자 취소)', () => {
      it('대기 중인 본인 요청은 취소하고 충전 건 잠금을 해제한다', async () => {
        (
          coinTopupRepository.findRefundRequestById as jest.Mock
        ).mockResolvedValue(basePendingRequest);

        const result = await service.cancelRefundRequest('req1', 1);

        expect(coinTopupRepository.updateRefundRequest).toHaveBeenCalledWith(
          'req1',
          { status: RefundRequestStatus.CANCELED },
          mockTx,
        );
        expect(coinTopupRepository.updateStatus).toHaveBeenCalledWith(
          'topup1',
          TopupStatus.COMPLETED,
          mockTx,
        );
        expect(result.status).toBe(RefundRequestStatus.CANCELED);
      });

      it('타인의 요청은 취소할 수 없다', async () => {
        (
          coinTopupRepository.findRefundRequestById as jest.Mock
        ).mockResolvedValue(basePendingRequest);

        await expect(service.cancelRefundRequest('req1', 2)).rejects.toThrow(
          NotFoundException,
        );
        expect(coinTopupRepository.updateRefundRequest).not.toHaveBeenCalled();
      });

      it('이미 처리된 요청은 취소할 수 없다', async () => {
        (
          coinTopupRepository.findRefundRequestById as jest.Mock
        ).mockResolvedValue({
          ...basePendingRequest,
          status: RefundRequestStatus.APPROVED,
        });

        await expect(service.cancelRefundRequest('req1', 1)).rejects.toThrow(
          '이미 처리된 환불 요청입니다.',
        );
        expect(coinTopupRepository.updateRefundRequest).not.toHaveBeenCalled();
      });
    });

    describe('approveRefundRequest (관리자 승인)', () => {
      it('승인 시 PG 취소·환불 처리 후 요청을 APPROVED로 종결한다', async () => {
        (
          coinTopupRepository.findRefundRequestById as jest.Mock
        ).mockResolvedValue(basePendingRequest);
        coinTopupRepository.findById.mockResolvedValue({
          ...baseTopup,
          status: TopupStatus.REFUND_REQUESTED,
        } as any);

        const result = await service.approveRefundRequest('req1', 99);

        expect(bootpayService.cancelPayment).toHaveBeenCalledWith(
          'receipt1',
          undefined,
          'User',
          '사용자 청약철회 승인 (요청 req1)',
          'refund_topup1',
        );
        expect(coinTopupRepository.markRefunded).toHaveBeenCalledWith(
          'topup1',
          1100,
          11000,
          mockTx,
        );
        expect(coinBalanceService.refundCoins).toHaveBeenCalledWith(
          1,
          1100,
          mockTx,
        );
        expect(coinTopupRepository.updateRefundRequest).toHaveBeenCalledWith(
          'req1',
          {
            status: RefundRequestStatus.APPROVED,
            processed_admin_idx: 99,
          },
          mockTx,
        );
        expect(auditLogService.record).toHaveBeenCalledWith(
          expect.objectContaining({
            adminIdx: 99,
            action: 'REFUND_REQUEST_APPROVE',
            targetId: 'topup1',
          }),
          mockTx,
        );
        expect(result.status).toBe(TopupStatus.REFUNDED);
        expect(result.request_id).toBe('req1');
      });

      it('잠금 상태(REFUND_REQUESTED)가 아닌 충전 건은 승인할 수 없다', async () => {
        (
          coinTopupRepository.findRefundRequestById as jest.Mock
        ).mockResolvedValue(basePendingRequest);
        coinTopupRepository.findById.mockResolvedValue(baseTopup as any); // COMPLETED

        await expect(service.approveRefundRequest('req1', 99)).rejects.toThrow(
          BadRequestException,
        );
        expect(bootpayService.cancelPayment).not.toHaveBeenCalled();
      });

      it('이미 처리된 요청은 승인할 수 없다', async () => {
        (
          coinTopupRepository.findRefundRequestById as jest.Mock
        ).mockResolvedValue({
          ...basePendingRequest,
          status: RefundRequestStatus.REJECTED,
        });

        await expect(service.approveRefundRequest('req1', 99)).rejects.toThrow(
          '이미 처리된 환불 요청입니다.',
        );
        expect(bootpayService.cancelPayment).not.toHaveBeenCalled();
      });
    });

    describe('rejectRefundRequest (관리자 거절)', () => {
      it('거절 시 사유를 기록하고 충전 건 잠금을 해제한다', async () => {
        (
          coinTopupRepository.findRefundRequestById as jest.Mock
        ).mockResolvedValue(basePendingRequest);

        const result = await service.rejectRefundRequest(
          'req1',
          99,
          '결제 도용 의심',
        );

        expect(coinTopupRepository.updateRefundRequest).toHaveBeenCalledWith(
          'req1',
          {
            status: RefundRequestStatus.REJECTED,
            processed_admin_idx: 99,
            reject_reason: '결제 도용 의심',
          },
          mockTx,
        );
        expect(coinTopupRepository.updateStatus).toHaveBeenCalledWith(
          'topup1',
          TopupStatus.COMPLETED,
          mockTx,
        );
        expect(auditLogService.record).toHaveBeenCalledWith(
          expect.objectContaining({
            adminIdx: 99,
            action: 'REFUND_REQUEST_REJECT',
            targetId: 'req1',
            reason: '결제 도용 의심',
          }),
          mockTx,
        );
        expect(bootpayService.cancelPayment).not.toHaveBeenCalled();
        expect(result.status).toBe(RefundRequestStatus.REJECTED);
      });
    });
  });
});
