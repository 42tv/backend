import { Injectable } from '@nestjs/common';
import {
  IdentityProviderInterface,
  VerifyIdentityCommand,
  VerifyIdentityResult,
} from './identity-provider.interface';

@Injectable()
export class DevIdentityProvider implements IdentityProviderInterface {
  async verify(_: VerifyIdentityCommand): Promise<VerifyIdentityResult> {
    return { verified: true };
  }
}
