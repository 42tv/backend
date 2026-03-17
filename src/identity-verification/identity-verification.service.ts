import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { ErrorMessages } from 'src/common/error-messages';
import { IdentityProviderFactory } from './identity-provider.factory';
import { UserService } from 'src/user/user.service';
import { ConfirmPhoneVerificationDto } from './dto/confirm-phone-verification.dto';

const REQUEST_TOKEN_TYPE = 'identity_verification_request';
const REQUEST_TOKEN_EXPIRY_SECONDS = 600; // 10분

interface RequestTokenPayload {
  typ: string;
  request_id: string;
  user_idx: number;
  provider: string;
}

@Injectable()
export class IdentityVerificationService {
  constructor(
    private readonly identityProviderFactory: IdentityProviderFactory,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async startPhoneVerification(user_idx: number) {
    const requestId = `ivreq_${uuidv4()}`;
    const provider = this.identityProviderFactory.getMode();

    const payload: RequestTokenPayload = {
      typ: REQUEST_TOKEN_TYPE,
      request_id: requestId,
      user_idx,
      provider,
    };

    const requestToken = this.jwtService.sign(payload);

    const expiresAt = new Date(
      Date.now() + REQUEST_TOKEN_EXPIRY_SECONDS * 1000,
    );

    return {
      requestId,
      requestToken,
      provider,
      expiresAt: expiresAt.toISOString(),
      startParams: {
        merchantUid: requestId,
        state: requestId,
      },
    };
  }

  async confirmPhoneVerification(
    user_idx: number,
    dto: ConfirmPhoneVerificationDto,
  ) {
    const token = this.verifyRequestToken(dto.requestToken, user_idx);

    const providerInstance = this.identityProviderFactory.getProvider();
    const result = await providerInstance.confirm({
      user_idx,
      request_id: token.request_id,
    });

    if (!result.verified) {
      throw new BadRequestException('본인인증 검증에 실패했습니다.');
    }

    const verifiedAt = new Date();

    if (result.ci) {
      const ciHash = this.hashCi(result.ci);
      await this.applyWithCiHash(user_idx, ciHash);
    } else {
      await this.userService.markIdentityVerified(user_idx);
    }

    return {
      verified: true,
      verifiedAt: verifiedAt.toISOString(),
    };
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

  private verifyRequestToken(
    token: string,
    user_idx: number,
  ): RequestTokenPayload {
    let payload: RequestTokenPayload;
    try {
      payload = this.jwtService.verify<RequestTokenPayload>(token);
    } catch {
      throw new UnauthorizedException(
        'requestToken이 유효하지 않거나 만료되었습니다.',
      );
    }

    if (payload.typ !== REQUEST_TOKEN_TYPE) {
      throw new BadRequestException('유효하지 않은 requestToken 타입입니다.');
    }

    if (payload.user_idx !== user_idx) {
      throw new UnauthorizedException(
        'requestToken의 사용자 정보가 일치하지 않습니다.',
      );
    }

    return payload;
  }

  private hashCi(ci: string): string {
    return createHash('sha256').update(ci.trim().toUpperCase()).digest('hex');
  }

  private async applyWithCiHash(
    user_idx: number,
    ciHash: string,
  ): Promise<void> {
    const existingUser = await this.userService.findByIdentityCiHash(ciHash);

    if (existingUser && existingUser.idx !== user_idx) {
      throw new ConflictException(
        '이미 다른 계정으로 본인인증된 사용자입니다.',
      );
    }

    await this.userService.markIdentityVerifiedWithCiHash(user_idx, ciHash);
  }
}
