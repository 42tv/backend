import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  ConfirmIdentityCommand,
  ConfirmIdentityResult,
  IdentityProviderInterface,
  VerifyIdentityCommand,
  VerifyIdentityResult,
} from './identity-provider.interface';

@Injectable()
export class ProdPgIdentityProvider implements IdentityProviderInterface {
  async verify(_: VerifyIdentityCommand): Promise<VerifyIdentityResult> {
    throw new ServiceUnavailableException(
      'prod 모드에서는 PG callback/webhook 검증이 필요합니다.',
    );
  }

  async confirm(_: ConfirmIdentityCommand): Promise<ConfirmIdentityResult> {
    // TODO(PG 계약 후): 응답의 생년월일 필드를 birth_date('YYYY-MM-DD')로 매핑할 것.
    // 응답에 생년월일이 없으면 별도 연령 확인 수단 필요 (성인방송 접근 판정에 사용됨).
    throw new ServiceUnavailableException(
      'PG 계약 후 이용 가능합니다. prod 모드에서는 provider 서버 재조회가 필요합니다.',
    );
  }
}
