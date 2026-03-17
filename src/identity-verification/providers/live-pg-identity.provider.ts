import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  ConfirmIdentityCommand,
  ConfirmIdentityResult,
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

  async confirm(_: ConfirmIdentityCommand): Promise<ConfirmIdentityResult> {
    throw new ServiceUnavailableException(
      'PG 계약 후 이용 가능합니다. live 모드에서는 provider 서버 재조회가 필요합니다.',
    );
  }
}
