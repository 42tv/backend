import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PayoutResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

@Injectable()
export class PgPayoutService {
  private readonly logger = new Logger(PgPayoutService.name);

  constructor(private readonly configService: ConfigService) {}

  async requestPayout(params: {
    settlementId: string;
    amount: number;
  }): Promise<PayoutResult> {
    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';

    if (isDev) {
      this.logger.log(
        `[DEV] PG payout simulated for settlement ${params.settlementId}, amount: ${params.amount}`,
      );
      return { success: true, transactionId: `dev_${Date.now()}` };
    }

    // TODO: 실제 PG사 본인인증 + 계좌인증 후 지급 API 호출
    return {
      success: false,
      error: 'PG payout not implemented for production',
    };
  }
}
