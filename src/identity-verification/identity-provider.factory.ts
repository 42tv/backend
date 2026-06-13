import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { IdentityVerificationMode } from './identity-verification-mode.enum';
import { IdentityProviderInterface } from './providers/identity-provider.interface';
import { DevIdentityProvider } from './providers/dev-identity.provider';
import { ProdPgIdentityProvider } from './providers/prod-pg-identity.provider';

@Injectable()
export class IdentityProviderFactory {
  private readonly mode: IdentityVerificationMode;

  constructor(
    private readonly configService: ConfigService,
    private readonly devIdentityProvider: DevIdentityProvider,
    private readonly prodPgIdentityProvider: ProdPgIdentityProvider,
  ) {
    this.mode =
      this.configService.get<string>('APP_ENV') === 'prod'
        ? IdentityVerificationMode.PROD
        : IdentityVerificationMode.DEV;
  }

  getMode(): IdentityVerificationMode {
    return this.mode;
  }

  getProvider(): IdentityProviderInterface {
    if (this.mode === IdentityVerificationMode.DEV) {
      return this.devIdentityProvider;
    }

    return this.prodPgIdentityProvider;
  }
}
