import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ErrorMessages } from 'src/common/error-messages';
import { PhoneVerificationPayload } from 'src/auth/interfaces/auth.interface';
import { IdentityProviderFactory } from './identity-provider.factory';
import { UserService } from 'src/user/user.service';

@Injectable()
export class IdentityVerificationService {
  constructor(
    private readonly identityProviderFactory: IdentityProviderFactory,
    private readonly userService: UserService,
  ) {}

  async verifyPhone(payload: PhoneVerificationPayload): Promise<void> {
    if (!payload?.idx) {
      throw new BadRequestException(ErrorMessages.USER.INVALID_TOKEN_INDEX);
    }

    const provider = this.identityProviderFactory.getProvider();
    const result = await provider.verify({
      user_idx: payload.idx,
      phone: payload.phone,
      code: payload.code,
    });

    if (!result.verified) {
      throw new BadRequestException('본인인증 검증에 실패했습니다.');
    }

    await this.userService.markIdentityVerified(payload.idx);
  }

  async assertPaymentEligible(user_idx: number): Promise<void> {
    const isIdentityVerified =
      await this.userService.isIdentityVerified(user_idx);

    if (!isIdentityVerified) {
      throw new ForbiddenException(
        ErrorMessages.PAYMENT.REQUIRES_IDENTITY_VERIFICATION,
      );
    }
  }

  async markIdentityVerified(user_idx: number): Promise<void> {
    await this.userService.markIdentityVerified(user_idx);
  }
}
