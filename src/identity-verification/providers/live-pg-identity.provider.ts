import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  IdentityProviderInterface,
  VerifyIdentityCommand,
  VerifyIdentityResult,
} from './identity-provider.interface';

@Injectable()
export class LivePgIdentityProvider implements IdentityProviderInterface {
  async verify(_: VerifyIdentityCommand): Promise<VerifyIdentityResult> {
    throw new ServiceUnavailableException(
      'live 모드에서는 PG callback/webhook 검증이 필요합니다.',
    );
  }
}
