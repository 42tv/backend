/**
 * PG사 공통 인터페이스
 * - PG 모듈 추가 시 이 인터페이스를 구현하면 됨
 */

export interface PaymentRequest {
  product_id: number;
  amount: number;
  user_idx: number;
  product_name: string;
  user_info?: {
    user_id: string;
    nickname: string;
    email?: string;
    phone?: string;
  };
}

export interface PaymentResponse {
  pg_transaction_id: string;
  pg_data: any; // PG사별 응답 데이터
  redirect_url?: string; // 결제 창 URL (웹)
  app_scheme?: string; // 앱 결제 스킴 (모바일)
}

export interface WebhookData {
  pg_transaction_id: string;
  status: 'success' | 'failed' | 'canceled';
  amount: number;
  pg_response: any; // PG사 원본 응답
}

/**
 * PG Provider 공통 인터페이스
 */
export interface PgProviderInterface {
  /**
   * 결제 준비 (PG사에 거래 생성 요청)
   * @param request 결제 요청 정보
   * @returns PG사 거래 ID 및 결제 창 정보
   */
  preparePayment(request: PaymentRequest): Promise<PaymentResponse>;

  /**
   * Webhook 서명 검증
   * @param body Webhook 요청 body
   * @param signature PG사 서명 (헤더 등에서 추출)
   * @returns 검증 성공 여부
   */
  verifyWebhook(body: any, signature?: string): Promise<boolean>;

  /**
   * Webhook 데이터 파싱
   * @param body Webhook 요청 body
   * @returns 표준화된 Webhook 데이터
   */
  parseWebhookData(body: any): Promise<WebhookData>;

  /**
   * 결제 취소/환불
   * @param pg_transaction_id PG사 거래 ID
   * @param reason 취소/환불 사유
   * @param amount 부분 환불 금액 (선택사항)
   * @returns 취소/환불 결과
   */
  cancelPayment(
    pg_transaction_id: string,
    reason: string,
    amount?: number,
  ): Promise<any>;
}
