import { Test, TestingModule } from '@nestjs/testing';
import { PaymentTransactionStatus } from '@prisma/client';
import { CoinTopupService } from './coin-topup.service';
import { CoinTopupRepository } from './coin-topup.repository';
import { ProductService } from '../product/product.service';
import { PaymentTransactionService } from '../payment/payment-transaction.service';
import { CoinBalanceService } from '../coin-balance/coin-balance.service';
import { CoinUsageService } from '../coin-usage/coin-usage.service';
import { PrismaService } from '../prisma/prisma.service';
import { PayoutCoinService } from '../payout-coin/payout-coin.service';

describe('CoinTopupService', () => {
  let service: CoinTopupService;
  let coinTopupRepository: jest.Mocked<CoinTopupRepository>;
  let paymentTransactionService: jest.Mocked<PaymentTransactionService>;

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
            updateStatus: jest.fn(),
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
          useValue: { addCoinsFromTopup: jest.fn() },
        },
        {
          provide: CoinUsageService,
          useValue: {},
        },
        {
          provide: PrismaService,
          useValue: { $transaction: jest.fn((cb: any) => cb(mockTx)) },
        },
        {
          provide: PayoutCoinService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get(CoinTopupService);
    coinTopupRepository = module.get(CoinTopupRepository);
    paymentTransactionService = module.get(PaymentTransactionService);
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
});
