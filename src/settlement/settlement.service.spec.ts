import { Test, TestingModule } from '@nestjs/testing';
import { SettlementService } from './settlement.service';
import { SettlementRepository } from './settlement.repository';
import { PayoutCoinRepository } from '../payout-coin/payout-coin.repository';
import { PrismaService } from '../prisma/prisma.service';
import { PgPayoutService } from './pg-payout.service';
import { PayoutStatus, SettlementStatus } from '@prisma/client';

describe('SettlementService', () => {
  let service: SettlementService;
  let settlementRepository: jest.Mocked<SettlementRepository>;
  let payoutCoinRepository: jest.Mocked<PayoutCoinRepository>;

  const mockTx = {};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementService,
        {
          provide: SettlementRepository,
          useValue: {
            create: jest.fn((data) => Promise.resolve({ id: 's1', ...data })),
            findById: jest.fn(),
            approve: jest.fn(),
            markAsPaid: jest.fn().mockResolvedValue({ id: 's1' }),
            reject: jest.fn(),
            updateStatus: jest.fn(),
            findStreamerBusinessType: jest.fn(),
            createAuditLog: jest.fn(),
          },
        },
        {
          provide: PayoutCoinRepository,
          useValue: {
            findByIds: jest.fn(),
            updateStatusBatch: jest.fn(),
            linkToSettlement: jest.fn(),
            unlinkFromSettlement: jest.fn(),
            findAvailableCoinsByAmount: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: { $transaction: jest.fn((cb: any) => cb(mockTx)) },
        },
        {
          provide: PgPayoutService,
          useValue: {
            requestPayout: jest
              .fn()
              .mockResolvedValue({ success: true, transactionId: 't1' }),
          },
        },
      ],
    }).compile();

    service = module.get<SettlementService>(SettlementService);
    settlementRepository = module.get(SettlementRepository);
    payoutCoinRepository = module.get(PayoutCoinRepository);
  });

  describe('createSettlement - 금액 계산(원천징수)', () => {
    const setupCoin = (businessType: string) => {
      payoutCoinRepository.findByIds.mockResolvedValue([
        {
          id: 'c1',
          status: PayoutStatus.AVAILABLE,
          streamer_idx: 1,
          coin_value: 10000,
        },
      ] as any);
      settlementRepository.findStreamerBusinessType.mockResolvedValue({
        business_type: businessType,
      } as any);
    };

    it('개인 스트리머: 3.3% 원천징수가 분리 적재된다', async () => {
      setupCoin('INDIVIDUAL');

      await service.createSettlement(1, ['c1']);

      const createArg = settlementRepository.create.mock.calls[0][0];
      expect(createArg).toMatchObject({
        total_value: 10000,
        fee_amount: 1000,
        tax_base: 9000,
        income_tax_amount: 270,
        local_tax_amount: 27,
        withholding_tax_amount: 297,
        payout_amount: 8703,
      });
    });

    it('법인 스트리머: 원천징수 비대상(0), payout = total - fee', async () => {
      setupCoin('CORPORATION');

      await service.createSettlement(1, ['c1']);

      const createArg = settlementRepository.create.mock.calls[0][0];
      expect(createArg).toMatchObject({
        total_value: 10000,
        fee_amount: 1000,
        tax_base: 9000,
        income_tax_amount: 0,
        local_tax_amount: 0,
        withholding_tax_amount: 0,
        payout_amount: 9000,
      });
    });
  });

  describe('감사 로그', () => {
    it('approveSettlement: APPROVE + PAY 로그 기록', async () => {
      settlementRepository.findById.mockResolvedValue({
        id: 's1',
        status: SettlementStatus.PENDING,
        payout_amount: 8703,
        payoutCoins: [{ id: 'c1' }],
      } as any);

      await service.approveSettlement('s1', 99);

      const actions = settlementRepository.createAuditLog.mock.calls.map(
        (call) => call[0].action,
      );
      expect(actions).toEqual(['APPROVE', 'PAY']);
      expect(
        settlementRepository.createAuditLog.mock.calls[0][0],
      ).toMatchObject({
        admin_idx: 99,
        before_status: SettlementStatus.PENDING,
        after_status: SettlementStatus.APPROVED,
      });
    });

    it('rejectSettlement: REJECT 로그 기록', async () => {
      settlementRepository.findById.mockResolvedValue({
        id: 's1',
        status: SettlementStatus.PENDING,
        payoutCoins: [{ id: 'c1' }],
      } as any);

      await service.rejectSettlement('s1', '서류 미비', 99);

      expect(settlementRepository.createAuditLog).toHaveBeenCalledTimes(1);
      expect(
        settlementRepository.createAuditLog.mock.calls[0][0],
      ).toMatchObject({
        admin_idx: 99,
        action: 'REJECT',
        before_status: SettlementStatus.PENDING,
        after_status: SettlementStatus.REJECTED,
        reason: '서류 미비',
      });
    });
  });
});
