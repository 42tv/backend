import { ConfigService } from '@nestjs/config';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { IdentityVerificationMode } from './identity-verification-mode.enum';
import { IdentityProviderInterface } from './providers/identity-provider.interface';
import { DevIdentityProvider } from './providers/dev-identity.provider';
import { LivePgIdentityProvider } from './providers/live-pg-identity.provider';

@Injectable()
export class IdentityProviderFactory {
  private readonly mode: IdentityVerificationMode;

  constructor(
    private readonly configService: ConfigService,
    private readonly devIdentityProvider: DevIdentityProvider,
    private readonly livePgIdentityProvider: LivePgIdentityProvider,
  ) {
    const mode =
      this.configService.get<string>('IDENTITY_VERIFICATION_MODE') ||
      IdentityVerificationMode.DEV;
    const normalizedMode = mode.toLowerCase();

    if (
      normalizedMode !== IdentityVerificationMode.DEV &&
      normalizedMode !== IdentityVerificationMode.LIVE
    ) {
      throw new InternalServerErrorException(
        `지원하지 않는 IDENTITY_VERIFICATION_MODE 입니다: ${mode}`,
      );
    }

    this.mode = normalizedMode as IdentityVerificationMode;
  }

  getMode(): IdentityVerificationMode {
    return this.mode;
  }

  getProvider(): IdentityProviderInterface {
    if (this.mode === IdentityVerificationMode.DEV) {
      return this.devIdentityProvider;
    }

    return this.livePgIdentityProvider;
  }
}
