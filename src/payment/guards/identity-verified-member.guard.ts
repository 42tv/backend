import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ErrorMessages } from 'src/common/error-messages';
import { IdentityVerificationService } from 'src/identity-verification/identity-verification.service';

@Injectable()
export class IdentityVerifiedMemberGuard implements CanActivate {
  constructor(
    private readonly identityVerificationService: IdentityVerificationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userIdx = req?.user?.idx;

    if (!userIdx) {
      throw new UnauthorizedException(ErrorMessages.AUTH.GUEST_NOT_ALLOWED);
    }

    await this.identityVerificationService.assertPaymentEligible(userIdx);
    return true;
  }
}
