import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { IdentityVerificationService } from './identity-verification.service';
import { IdentityProviderFactory } from './identity-provider.factory';
import { UserService } from 'src/user/user.service';

describe('IdentityVerificationService', () => {
  let service: IdentityVerificationService;

  const mockProvider = {
    verify: jest.fn(),
    confirm: jest.fn(),
  };
  const mockIdentityProviderFactory = {
    getMode: jest.fn().mockReturnValue('dev'),
    getProvider: jest.fn().mockReturnValue(mockProvider),
  };
  const mockUserService = {
    markIdentityVerified: jest.fn(),
    markIdentityVerifiedWithCiHash: jest.fn(),
    findByIdentityCiHash: jest.fn(),
    isIdentityVerified: jest.fn(),
  };
  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityVerificationService,
        {
          provide: IdentityProviderFactory,
          useValue: mockIdentityProviderFactory,
        },
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<IdentityVerificationService>(
      IdentityVerificationService,
    );
  });

  describe('isAdultByBirthDate', () => {
    const currentYear = new Date().getFullYear();
    const isAdultByBirthDate = (birthDate?: string): boolean =>
      service['isAdultByBirthDate'](birthDate);

    it('만 19세가 되는 해(출생연도 + 19)는 성인이다', () => {
      expect(isAdultByBirthDate(`${currentYear - 19}-12-31`)).toBe(true);
    });

    it('만 19세가 되기 전 해(출생연도 + 18)는 미성년이다', () => {
      expect(isAdultByBirthDate(`${currentYear - 18}-01-01`)).toBe(false);
    });

    it('birth_date가 없으면 미성년으로 판정한다', () => {
      expect(isAdultByBirthDate(undefined)).toBe(false);
    });

    it('birth_date가 잘못된 형식이면 미성년으로 판정한다', () => {
      expect(isAdultByBirthDate('invalid-date')).toBe(false);
    });
  });

  describe('confirmPhoneVerification', () => {
    const userIdx = 1;
    const requestToken = 'valid-token';
    const adultBirthDate = `${new Date().getFullYear() - 30}-01-01`;
    const minorBirthDate = `${new Date().getFullYear() - 10}-01-01`;

    beforeEach(() => {
      mockJwtService.verify.mockReturnValue({
        typ: 'identity_verification_request',
        request_id: 'ivreq_test',
        user_idx: userIdx,
        provider: 'dev',
      });
    });

    it('성인 birth_date면 is_adult=true로 인증 상태를 반영한다', async () => {
      mockProvider.confirm.mockResolvedValue({
        verified: true,
        birth_date: adultBirthDate,
      });

      const result = await service.confirmPhoneVerification(userIdx, {
        requestToken,
      });

      expect(result.verified).toBe(true);
      expect(mockUserService.markIdentityVerified).toHaveBeenCalledWith(
        userIdx,
        true,
      );
    });

    it('미성년 birth_date면 is_adult=false로 인증 상태를 반영한다', async () => {
      mockProvider.confirm.mockResolvedValue({
        verified: true,
        birth_date: minorBirthDate,
      });

      await service.confirmPhoneVerification(userIdx, { requestToken });

      expect(mockUserService.markIdentityVerified).toHaveBeenCalledWith(
        userIdx,
        false,
      );
    });

    it('CI가 있으면 CI hash와 함께 is_adult를 반영한다', async () => {
      mockProvider.confirm.mockResolvedValue({
        verified: true,
        ci: 'test-ci-value',
        birth_date: adultBirthDate,
      });
      mockUserService.findByIdentityCiHash.mockResolvedValue(null);

      await service.confirmPhoneVerification(userIdx, { requestToken });

      expect(
        mockUserService.markIdentityVerifiedWithCiHash,
      ).toHaveBeenCalledWith(userIdx, expect.any(String), true);
    });
  });
});
