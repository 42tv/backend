import { Injectable, BadRequestException } from '@nestjs/common';
import { PgProviderInterface } from './pg-provider.interface';
import { MockPgProvider } from './mock-provider.service';
import { PgProvider } from '../dto/create-payment-transaction.dto';

/**
 * PG Provider Factory (전략 패턴)
 * - PG사별 Provider를 반환
 * - 새로운 PG사 추가 시 여기에 case 추가만 하면 됨
 */
@Injectable()
export class PgProviderFactory {
  constructor(
    private readonly mockProvider: MockPgProvider,
    // TODO: 실제 PG 모듈 추가 시 여기에 주입
    // private readonly tossProvider: TossPgProvider,
    // private readonly inicisProvider: InicisPgProvider,
    // private readonly kakaopayProvider: KakaopayPgProvider,
  ) {}

  /**
   * PG사에 맞는 Provider 반환
   * @param pgProvider PG사 종류
   * @returns PG Provider 인스턴스
   */
  getProvider(pgProvider: PgProvider): PgProviderInterface {
    switch (pgProvider) {
      case PgProvider.MOCK:
        return this.mockProvider;

      // TODO: 실제 PG 모듈 추가 시 주석 해제
      // case PgProvider.TOSS:
      //   return this.tossProvider;
      //
      // case PgProvider.INICIS:
      //   return this.inicisProvider;
      //
      // case PgProvider.KAKAOPAY:
      //   return this.kakaopayProvider;

      default:
        throw new BadRequestException(
          `지원하지 않는 PG사입니다: ${pgProvider}`,
        );
    }
  }

  /**
   * 사용 가능한 PG사 목록 반환
   * @returns 사용 가능한 PG사 배열
   */
  getAvailableProviders(): PgProvider[] {
    return [
      PgProvider.MOCK,
      // TODO: 실제 PG 모듈 추가 시 여기에 추가
      // PgProvider.TOSS,
      // PgProvider.INICIS,
      // PgProvider.KAKAOPAY,
    ];
  }
}
