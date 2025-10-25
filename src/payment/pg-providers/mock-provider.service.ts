import { Injectable } from '@nestjs/common';
import {
  PgProviderInterface,
  PaymentRequest,
  PaymentResponse,
  WebhookData,
} from './pg-provider.interface';

/**
 * Mock PG Provider
 * - 개발/테스트용 Mock 결제 처리
 * - 실제 PG 모듈 없이 결제 플로우 테스트 가능
 */
@Injectable()
export class MockPgProvider implements PgProviderInterface {
  /**
   * Mock 결제 준비
   * - 즉시 Mock 거래 ID 생성
   */
  async preparePayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Mock PG 거래 ID 생성
    const mockPgTransactionId = `MOCK_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      pg_transaction_id: mockPgTransactionId,
      pg_data: {
        mock: true,
        timestamp: new Date().toISOString(),
        message: 'Mock payment for development/testing',
        request_info: {
          product_id: request.product_id,
          amount: request.amount,
          product_name: request.product_name,
        },
      },
      // Mock은 redirect 없이 즉시 처리
    };
  }

  /**
   * Mock Webhook 검증
   * - 항상 true 반환 (검증 없음)
   */
  async verifyWebhook(): Promise<boolean> {
    // Mock은 항상 검증 통과
    return true;
  }

  /**
   * Mock Webhook 데이터 파싱
   */
  async parseWebhookData(body: any): Promise<WebhookData> {
    return {
      pg_transaction_id: body.pg_transaction_id,
      status: body.status || 'success',
      amount: body.amount,
      pg_response: {
        mock: true,
        timestamp: new Date().toISOString(),
        ...body,
      },
    };
  }

  /**
   * Mock 결제 취소
   * - 항상 성공 반환
   */
  async cancelPayment(
    pg_transaction_id: string,
    reason: string,
    amount?: number,
  ): Promise<any> {
    return {
      success: true,
      mock: true,
      pg_transaction_id,
      reason,
      canceled_amount: amount,
      timestamp: new Date().toISOString(),
    };
  }
}
