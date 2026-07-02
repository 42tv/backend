import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AccountDeletionService } from './account-deletion.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRepository } from 'src/user/user.repository';
import { NcpChannelService } from 'src/ncp-live-station/services/ncp-channel.service';
import { AwsService } from 'src/aws/aws.service';
import { RedisService } from 'src/redis/redis.service';

jest.mock('bcrypt');

describe('AccountDeletionService', () => {
  let service: AccountDeletionService;
  let userRepository: jest.Mocked<UserRepository>;
  let ncpChannelService: jest.Mocked<NcpChannelService>;
  let awsService: jest.Mocked<AwsService>;
  let redisService: jest.Mocked<RedisService>;

  // 트랜잭션 내 차단 조건 검사용 mock — 기본값은 전부 통과
  const mockTx = {
    stream: { findUnique: jest.fn() },
    paymentTransaction: { findFirst: jest.fn() },
    coinBalance: { findUnique: jest.fn() },
    payoutCoin: { findFirst: jest.fn() },
    settlement: { findFirst: jest.fn() },
  };

  const passwordUser = {
    idx: 1,
    user_id: 'tester',
    nickname: '테스터',
    password: 'hashed-password',
    profile_img: '',
    ncpChannel: null,
  };

  const oauthUser = {
    ...passwordUser,
    password: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.CDN_URL = 'https://cdn.test';

    Object.values(mockTx).forEach((model) =>
      Object.values(model).forEach((fn) => fn.mockResolvedValue(null)),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountDeletionService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn((cb: any) => cb(mockTx)),
          },
        },
        {
          provide: UserRepository,
          useValue: {
            getUserWithRelations: jest.fn(),
            deleteUser: jest.fn(),
          },
        },
        {
          provide: NcpChannelService,
          useValue: { deleteChannel: jest.fn() },
        },
        {
          provide: AwsService,
          useValue: { deleteFromS3: jest.fn() },
        },
        {
          provide: RedisService,
          useValue: { deleteMultipleKeys: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AccountDeletionService);
    userRepository = module.get(UserRepository);
    ncpChannelService = module.get(NcpChannelService);
    awsService = module.get(AwsService);
    redisService = module.get(RedisService);

    ncpChannelService.deleteChannel.mockResolvedValue({} as any);
    awsService.deleteFromS3.mockResolvedValue(undefined as any);
    redisService.deleteMultipleKeys.mockResolvedValue(0);
  });

  describe('본인 재확인', () => {
    it('일반 계정 + 비밀번호 불일치 시 400', async () => {
      userRepository.getUserWithRelations.mockResolvedValue(
        passwordUser as any,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.deleteAccount(1, { password: 'wrong' }),
      ).rejects.toThrow(BadRequestException);
      expect(userRepository.deleteUser).not.toHaveBeenCalled();
    });

    it('OAuth 계정 + confirm 누락 시 400', async () => {
      userRepository.getUserWithRelations.mockResolvedValue(oauthUser as any);

      await expect(service.deleteAccount(1, {})).rejects.toThrow(
        BadRequestException,
      );
      expect(userRepository.deleteUser).not.toHaveBeenCalled();
    });
  });

  describe('차단 조건', () => {
    beforeEach(() => {
      userRepository.getUserWithRelations.mockResolvedValue(oauthUser as any);
    });

    it('방송 중이면 400', async () => {
      mockTx.stream.findUnique.mockResolvedValue({ idx: 1 });

      await expect(service.deleteAccount(1, { confirm: true })).rejects.toThrow(
        '방송 종료 후 탈퇴할 수 있습니다.',
      );
      expect(userRepository.deleteUser).not.toHaveBeenCalled();
    });

    it('잔여 코인이 있으면 400', async () => {
      mockTx.coinBalance.findUnique.mockResolvedValue({ coin_balance: 100 });

      await expect(service.deleteAccount(1, { confirm: true })).rejects.toThrow(
        '잔여 코인을 환불받거나 사용한 후 탈퇴할 수 있습니다.',
      );
      expect(userRepository.deleteUser).not.toHaveBeenCalled();
    });

    it('미정산 PayoutCoin이 있으면 400', async () => {
      mockTx.payoutCoin.findFirst.mockResolvedValue({ id: 'p1' });

      await expect(service.deleteAccount(1, { confirm: true })).rejects.toThrow(
        '미정산 수익이 있습니다. 정산 완료 후 탈퇴할 수 있습니다.',
      );
      expect(userRepository.deleteUser).not.toHaveBeenCalled();
    });

    it('처리 중인 Settlement가 있으면 400', async () => {
      mockTx.settlement.findFirst.mockResolvedValue({ id: 's1' });

      await expect(service.deleteAccount(1, { confirm: true })).rejects.toThrow(
        '처리 중인 정산이 있습니다. 정산 완료 후 탈퇴할 수 있습니다.',
      );
      expect(userRepository.deleteUser).not.toHaveBeenCalled();
    });
  });

  describe('정상 탈퇴', () => {
    const userWithResources = {
      ...passwordUser,
      profile_img: 'https://cdn.test/profile/abc.jpg',
      ncpChannel: { channel_id: 'ls-test-channel' },
    };

    beforeEach(() => {
      userRepository.getUserWithRelations.mockResolvedValue(
        userWithResources as any,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    });

    it('User 삭제 + 외부 자원 정리를 수행한다', async () => {
      await service.deleteAccount(1, { password: 'correct' });

      expect(userRepository.deleteUser).toHaveBeenCalledWith(1, mockTx);

      expect(ncpChannelService.deleteChannel).toHaveBeenCalledWith(
        'ls-test-channel',
      );
      expect(awsService.deleteFromS3).toHaveBeenCalledWith('profile/abc.jpg');
      expect(redisService.deleteMultipleKeys).toHaveBeenCalledWith([
        'viewer:tester',
      ]);
    });

    it('NCP 채널 삭제가 실패해도 탈퇴는 성공한다 (best-effort)', async () => {
      ncpChannelService.deleteChannel.mockRejectedValue(new Error('NCP error'));

      await expect(
        service.deleteAccount(1, { password: 'correct' }),
      ).resolves.toBeUndefined();
      expect(userRepository.deleteUser).toHaveBeenCalled();
    });
  });
});
