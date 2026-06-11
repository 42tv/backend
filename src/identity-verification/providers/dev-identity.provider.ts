import { Injectable } from '@nestjs/common';
import {
  ConfirmIdentityCommand,
  ConfirmIdentityResult,
  IdentityProviderInterface,
  VerifyIdentityCommand,
  VerifyIdentityResult,
} from './identity-provider.interface';

@Injectable()
export class DevIdentityProvider implements IdentityProviderInterface {
  async verify(_: VerifyIdentityCommand): Promise<VerifyIdentityResult> {
    return { verified: true };
  }

  async confirm(_: ConfirmIdentityCommand): Promise<ConfirmIdentityResult> {
    // 개발용: 항상 성인. 미성년 시나리오는 IDENTITY_DEV_BIRTH_DATE 환경변수로 재정의
    return {
      verified: true,
      birth_date: process.env.IDENTITY_DEV_BIRTH_DATE ?? '1990-01-01',
    };
  }
}
