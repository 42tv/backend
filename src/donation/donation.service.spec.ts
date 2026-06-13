import { Test, TestingModule } from '@nestjs/testing';
import { DonationService } from './donation.service';
import { DonationRepository } from './donation.repository';
import { CoinUsageService } from '../coin-usage/coin-usage.service';
import { CoinBalanceService } from '../coin-balance/coin-balance.service';
import { PayoutCoinService } from '../payout-coin/payout-coin.service';
import { PrismaService } from '../prisma/prisma.service';
import { FanService } from '../fan/fan.service';
import { FanRepository } from '../fan/fan.repository';
import { RedisService } from '../redis/redis.service';
import { UserService } from '../user/user.service';

describe('DonationService', () => {
  let service: DonationService;
  let donationRepository: jest.Mocked<DonationRepository>;

  const mockTx = {};

  const donor = { idx: 1, user_id: 'donor', nickname: '후원자' };
  const streamer = { idx: 2, user_id: 'streamer', nickname: '스트리머' };

  const mockFan = {
    current_level_id: 10,
    current_level: { name: 'lv1', color: '#fff' },
    total_donation: 500,
  };

  const mockDonation = {
    id: 'd1',
    coin_amount: 500,
    coin_value: 500,
    message: null,
    donated_at: new Date(),
    donor: { ...donor, profile_img: '' },
    streamer: { ...streamer, profile_img: '' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonationService,
        {
          provide: DonationRepository,
          useValue: { create: jest.fn().mockResolvedValue(mockDonation) },
        },
        {
          provide: CoinUsageService,
          useValue: { useCoins: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: CoinBalanceService,
          useValue: {
            getCoinBalance: jest.fn().mockResolvedValue({ coin_balance: 1000 }),
            receiveCoins: jest.fn(),
          },
        },
        {
          provide: PayoutCoinService,
          useValue: { createPayoutCoinsFromDonation: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: { $transaction: jest.fn((cb: any) => cb(mockTx)) },
        },
        {
          provide: FanService,
          useValue: {
            matchFanLevelByAmount: jest
              .fn()
              .mockResolvedValue({ id: 10, name: 'lv1', color: '#fff' }),
          },
        },
        {
          provide: FanRepository,
          useValue: {
            findFan: jest.fn().mockResolvedValue(mockFan),
            updateTotalDonationAndLevel: jest.fn(),
            createFanRelation: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: { publishRoomMessage: jest.fn() },
        },
        {
          provide: UserService,
          useValue: {
            findByUserId: jest.fn().mockResolvedValue(streamer),
            findByUserIdx: jest.fn().mockResolvedValue(donor),
          },
        },
      ],
    }).compile();

    service = module.get(DonationService);
    donationRepository = module.get(DonationRepository);
  });

  it('후원 생성 시 양측 스냅샷과 파기 예정 시각(거래일 + 5년)을 기록한다', async () => {
    await service.donate(1, 'streamer', 500);

    expect(donationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        donor_snapshot: {
          user_idx: 1,
          user_id: 'donor',
          nickname: '후원자',
        },
        streamer_snapshot: {
          user_idx: 2,
          user_id: 'streamer',
          nickname: '스트리머',
        },
        should_delete_at: expect.any(Date),
      }),
      mockTx,
    );

    const createInput = donationRepository.create.mock.calls[0][0] as any;
    expect(createInput.should_delete_at.getFullYear()).toBe(
      new Date().getFullYear() + 5,
    );
  });
});
