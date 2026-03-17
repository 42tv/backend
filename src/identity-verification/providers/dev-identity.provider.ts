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
    return { verified: true };
  }
}
