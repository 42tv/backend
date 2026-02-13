import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bootpay } from '@bootpay/backend-js';
import {
  PgProviderInterface,
  PaymentRequest,
  PaymentResponse,
  WebhookData,
} from './pg-provider.interface';

/**
 * Bootpay PG Provider
 * - Bootpay 결제 시스템 연동
 * - Sandbox 및 Production 환경 지원
 */
@Injectable()
export class BootpayProvider implements PgProviderInterface {
  private readonly logger = new Logger(BootpayProvider.name);
  private initialized = false;

  constructor(private readonly configService: ConfigService) {
    this.initializeBootpay();
  }

  /**
   * Bootpay SDK 초기화
   */
  private initializeBootpay() {
    if (this.initialized) return;

    const applicationId = this.configService.get<string>(
      'BOOTPAY_APPLICATION_ID',
    );
    const privateKey = this.configService.get<string>('BOOTPAY_PRIVATE_KEY');

    if (!applicationId || !privateKey) {
      this.logger.warn(
        'Bootpay credentials not configured. Using sandbox defaults.',
      );
      // Sandbox test credentials
      Bootpay.setConfiguration({
        application_id: '5b8f6a4d396fa665fdc2b5e7',
        private_key: 'rm6EYECr6aroQVG2ntW0A6LpWnkTgP4uQ3H/+boffG0=',
      });
    } else {
      Bootpay.setConfiguration({
        application_id: applicationId,
        private_key: privateKey,
      });
    }

    this.initialized = true;
    this.logger.log('Bootpay initialized successfully');
  }

  /**
   * Bootpay 결제 준비
   * - 프론트엔드에서 사용할 결제 정보 반환
   * @param request 결제 요청 정보
   * @returns 결제 준비 응답 (order_id 등)
   */
  async preparePayment(request: PaymentRequest): Promise<PaymentResponse> {
    this.initializeBootpay();

    // Bootpay order_id 생성 (고유해야 함)
    const orderId = `ORDER_${Date.now()}_${request.user_idx}_${request.product_id}`;

    // Bootpay는 클라이언트 측에서 결제를 시작하므로
    // 서버에서는 order_id와 필요한 정보만 반환
    const bootpayConfig = {
      application_id:
        this.configService.get<string>('BOOTPAY_APPLICATION_ID') ||
        '5b8f6a4d396fa665fdc2b5e7',
      price: request.amount,
      order_name: request.product_name,
      order_id: orderId,
      user: {
        id: request.user_info?.user_id || `user_${request.user_idx}`,
        username: request.user_info?.nickname || 'Guest',
        email: request.user_info?.email,
        phone: request.user_info?.phone,
      },
    };

    this.logger.log(`Bootpay payment prepared: ${orderId}`);

    return {
      pg_transaction_id: orderId, // order_id를 pg_transaction_id로 사용
      pg_data: bootpayConfig,
      // Bootpay는 클라이언트 SDK를 사용하므로 redirect_url 불필요
    };
  }

  /**
   * Bootpay Webhook 검증
   * - receipt_id로 실제 결제 상태 조회 및 검증
   * @param body Webhook 요청 body (receipt_id 포함)
   * @returns 검증 성공 여부
   */
  async verifyWebhook(body: any, _signature?: string): Promise<boolean> {
    try {
      this.initializeBootpay();

      const receiptId = body.receipt_id || body.receiptId;
      if (!receiptId) {
        this.logger.error('Webhook missing receipt_id');
        return false;
      }

      // Bootpay API로 실제 결제 상태 조회
      await Bootpay.getAccessToken();
      const response = await Bootpay.receiptPayment(receiptId);

      // 결제 상태 확인
      const status =
        (response as any).data?.status ?? (response as any).status;
      const normalizedStatus =
        typeof status === 'number' ? status : Number(status);
      // 최신 코드표 기준 상태 + 레거시 호환 상태
      const validStatuses = [-10, -4, -2, -1, 0, 1, 2, 4, 5, 20];
      const isValid = validStatuses.includes(normalizedStatus);

      this.logger.log(
        `Bootpay webhook verification: ${receiptId} (${normalizedStatus}) - ${isValid ? 'VALID' : 'INVALID'}`,
      );

      return isValid;
    } catch (error) {
      const err = error as any;
      this.logger.error(
        `Bootpay webhook verification failed: ${err.message}`,
        err.stack,
      );
      return false;
    }
  }

  /**
   * Bootpay Webhook 데이터 파싱
   * @param body Webhook 요청 body
   * @returns 표준화된 Webhook 데이터 (전체 receipt 정보 포함)
   */
  async parseWebhookData(body: any): Promise<WebhookData> {
    this.initializeBootpay();

    const receiptId = body.receipt_id || body.receiptId;
    const webhookType = (body.webhook_type || body.webhookType) as
      | string
      | undefined;

    // Bootpay API로 상세 정보 조회
    await Bootpay.getAccessToken();
    const response = await Bootpay.receiptPayment(receiptId);

    const data = (response as any).data || response;
    const status = data.status;

    // Bootpay 상태 코드를 표준 상태로 변환
    // 최신 코드: 1(완료), 20(취소), 5(가상계좌 발급/입금대기), 0/2/4(진행중)
    // 레거시 호환: -1(취소), -2/-4(실패), -10(만료)
    const normalizedStatus =
      typeof status === 'number' ? status : Number(status);

    const normalizedWebhookType = webhookType?.toUpperCase();

    // webhook_type이 있으면 이를 우선으로 분기하고, 없으면 status 코드로 후순위 분기
    let standardStatus: WebhookData['status'] | null = null;
    if (normalizedWebhookType === 'PAYMENT_COMPLETED') {
      standardStatus = 'success';
    } else if (normalizedWebhookType === 'PAYMENT_CANCELLED') {
      standardStatus = 'canceled';
    } else if (normalizedWebhookType === 'PAYMENT_PARTIAL_CANCELLED') {
      standardStatus = 'partial_canceled';
    } else if (normalizedWebhookType === 'PAYMENT_VIRTUAL_ACCOUNT_ISSUED') {
      standardStatus = 'pending';
    } else if (normalizedWebhookType === 'PAYMENT_EXPIRED') {
      standardStatus = 'expired';
    } else if (
      normalizedWebhookType === 'PAYMENT_CONFIRM_FAILED' ||
      normalizedWebhookType === 'PAYMENT_CANCEL_FAILED' ||
      normalizedWebhookType === 'PAYMENT_REQUEST_FAILED' ||
      normalizedWebhookType === 'ERROR'
    ) {
      standardStatus = 'failed';
    }

    if (!standardStatus) {
      if (normalizedStatus === 1) {
        standardStatus = 'success';
      } else if (normalizedStatus === 20 || normalizedStatus === -1) {
        standardStatus = 'canceled';
      } else if (
        normalizedStatus === 5 ||
        normalizedStatus === 4 ||
        normalizedStatus === 2 ||
        normalizedStatus === 0
      ) {
        standardStatus = 'pending';
      } else if (normalizedStatus === -10) {
        standardStatus = 'expired';
      } else {
        standardStatus = 'failed';
      }
    }

    return {
      pg_transaction_id: data.order_id || receiptId, // order_id 사용
      status: standardStatus,
      amount: data.price || 0,
      pg_response: {
        ...data,
        webhook_type: normalizedWebhookType || data.webhook_type,
      }, // 전체 receipt 데이터 전달 + webhook_type 보존
    };
  }

  /**
   * Bootpay Receipt 전체 데이터 조회
   * @param receipt_id Bootpay 영수증 ID
   * @returns 전체 Receipt 데이터
   */
  async getReceiptData(receipt_id: string): Promise<any> {
    this.initializeBootpay();

    await Bootpay.getAccessToken();
    const response = await Bootpay.receiptPayment(receipt_id);

    return (response as any).data || response;
  }

  /**
   * Bootpay 결제 취소
   * @param pg_transaction_id 결제 ID (receipt_id)
   * @param reason 취소 사유
   * @param amount 부분 환불 금액 (선택사항)
   * @returns 취소 결과
   */
  async cancelPayment(
    pg_transaction_id: string,
    reason: string,
    amount?: number,
  ): Promise<any> {
    try {
      this.initializeBootpay();

      await Bootpay.getAccessToken();

      const cancelData: any = {
        receipt_id: pg_transaction_id,
        cancel_username: 'Admin',
        cancel_message: reason,
      };

      if (amount) {
        cancelData.cancel_price = amount;
      }

      const response = await Bootpay.cancelPayment(cancelData);
      this.logger.log(`Bootpay payment cancelled: ${pg_transaction_id}`);

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      const err = error as any;
      this.logger.error(
        `Bootpay payment cancellation failed: ${err.message}`,
        err.stack,
      );
      return {
        success: false,
        error: err.message,
      };
    }
  }
}
