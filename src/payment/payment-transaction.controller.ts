import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { PaymentTransactionService } from './payment-transaction.service';
import { CreatePaymentTransactionDto } from './dto/create-payment-transaction.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PreparePaymentDto } from './dto/prepare-payment.dto';
import { MemberGuard } from '../auth/guard/jwt.member.guard';
import { GetUser } from '../auth/get-user.decorator';
import { PgProviderFactory } from './pg-providers/pg-provider.factory';
import { PgProvider } from './dto/create-payment-transaction.dto';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { WebhookData } from './pg-providers/pg-provider.interface';
import { RedisService } from '../redis/redis.service';

@Controller('payments')
export class PaymentTransactionController {
  private readonly logger = new Logger(PaymentTransactionController.name);

  constructor(
    private readonly paymentTransactionService: PaymentTransactionService,
    private readonly pgProviderFactory: PgProviderFactory,
    private readonly redisService: RedisService,
  ) {}

  @Post('prepare')
  @UseGuards(MemberGuard)
  async preparePayment(
    @GetUser() user,
    @Body() prepareDto: PreparePaymentDto,
  ): Promise<SuccessResponseDto<any>> {
    this.logger.debug(
      `결제 준비 요청 - User: ${user.idx}, Product: ${prepareDto.product_id}, PG: ${prepareDto.pg_provider}`,
    );

    const payment = await this.paymentTransactionService.preparePayment(
      user.idx,
      prepareDto.product_id,
      prepareDto.pg_provider,
    );

    return ResponseWrapper.success(payment, '결제 준비가 완료되었습니다.');
  }

  @Post()
  @UseGuards(MemberGuard)
  async create(
    @GetUser() user: { user_idx: number },
    @Body() createDto: CreatePaymentTransactionDto,
  ): Promise<SuccessResponseDto<any>> {
    const transaction = await this.paymentTransactionService.create(
      user.user_idx,
      createDto,
    );
    return ResponseWrapper.success(
      transaction,
      '결제 트랜잭션을 생성했습니다.',
    );
  }

  @Post('success')
  async processSuccessfulPayment(
    @Body('pg_transaction_id') pg_transaction_id: string,
    @Body('product_id', ParseIntPipe) product_id: number,
    @Body('pg_response') pg_response?: any,
  ): Promise<SuccessResponseDto<any>> {
    const result =
      await this.paymentTransactionService.processSuccessfulPayment(
        pg_transaction_id,
        product_id,
        pg_response,
      );
    return ResponseWrapper.success(result, '결제를 성공 처리했습니다.');
  }

  @Post('approve')
  async approvePayment(
    @Body() updateDto: UpdatePaymentStatusDto,
  ): Promise<SuccessResponseDto<any>> {
    const result = await this.paymentTransactionService.approvePayment(
      updateDto.pg_transaction_id,
      updateDto.pg_response,
    );
    return ResponseWrapper.success(result, '결제를 승인했습니다.');
  }

  @Post('fail')
  async failPayment(
    @Body() updateDto: UpdatePaymentStatusDto,
  ): Promise<SuccessResponseDto<any>> {
    const result = await this.paymentTransactionService.failPayment(
      updateDto.pg_transaction_id,
      updateDto.pg_response,
    );
    return ResponseWrapper.success(result, '결제를 실패 처리했습니다.');
  }

  @Post('cancel')
  async cancelPayment(
    @Body() updateDto: UpdatePaymentStatusDto,
  ): Promise<SuccessResponseDto<any>> {
    const result = await this.paymentTransactionService.cancelPayment(
      updateDto.pg_transaction_id,
      updateDto.pg_response,
    );
    return ResponseWrapper.success(result, '결제를 취소했습니다.');
  }

  @Get('pg/:pg_transaction_id')
  async findByPgTransactionId(
    @Param('pg_transaction_id') pg_transaction_id: string,
  ): Promise<SuccessResponseDto<any>> {
    const transaction =
      await this.paymentTransactionService.findByPgTransactionId(
        pg_transaction_id,
      );
    return ResponseWrapper.success(transaction, '결제 정보를 조회했습니다.');
  }

  @Get('me')
  @UseGuards(MemberGuard)
  async getMyTransactions(
    @GetUser() user: { user_idx: number },
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<SuccessResponseDto<any>> {
    const transactions = await this.paymentTransactionService.findByUserId(
      user.user_idx,
      limit,
    );
    return ResponseWrapper.success(
      transactions,
      '내 결제 내역을 조회했습니다.',
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<SuccessResponseDto<any>> {
    const transaction = await this.paymentTransactionService.findById(id);
    return ResponseWrapper.success(transaction, '결제 상세를 조회했습니다.');
  }

  /**
   * PG사별 Webhook 엔드포인트
   * - PG사에서 결제 결과를 전송하는 엔드포인트
   * - 각 PG사의 Webhook 설정에 이 URL을 등록해야 함
   * @param pg_provider PG사 종류 (inicis, toss, kakaopay, bootpay)
   * @param body Webhook 요청 body
   * @param signature PG사 서명 (헤더에서 추출)
   */
  @Post('webhook/:pg_provider')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('pg_provider') pg_provider: string,
    @Body() body: any,
    @Headers('x-signature') signature?: string,
    @Headers('authorization') authorization?: string,
  ): Promise<{ success: boolean; error?: string; error_code?: string }> {
    this.logger.log(`Webhook 수신 - PG: ${pg_provider}`);

    try {
      const pgProviderEnum = this.resolvePgProvider(pg_provider);
      if (!pgProviderEnum) {
        return {
          success: false,
          error_code: 'UNSUPPORTED_PG_PROVIDER',
          error: `지원하지 않는 PG사입니다: ${pg_provider}`,
        };
      }

      const webhookData = await this.verifyAndParseWebhook(
        pgProviderEnum,
        body,
        signature,
        authorization,
      );
      if (!webhookData) {
        return {
          success: false,
          error_code: 'WEBHOOK_VERIFICATION_FAILED',
          error: 'Webhook 서명 검증 또는 데이터 파싱에 실패했습니다',
        };
      }

      this.logWebhookData(pg_provider, webhookData);

      // 웹훅 상태에 따른 비즈니스 로직 처리
      await this.processWebhookByStatus(webhookData);

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Webhook 처리 오류', error);

      // 일시적 에러 (DB/Redis 연결 실패 등)는 503 반환하여 PG사 재시도 유도
      if (this.isRetryableError(error)) {
        return {
          success: false,
          error_code: 'WEBHOOK_TEMPORARY_ERROR',
          error: '일시적 오류가 발생했습니다. 잠시 후 재시도해주세요.',
        };
      }

      return {
        success: false,
        error_code: 'WEBHOOK_PROCESSING_ERROR',
        error: `Webhook 처리 중 오류가 발생했습니다: ${errorMessage}`,
      };
    }
  }

  /**
   * PG Provider 문자열을 enum으로 변환
   */
  private resolvePgProvider(pg_provider: string): PgProvider | null {
    const pgProviderEnum = Object.values(PgProvider).find(
      (v) => v === pg_provider.toLowerCase(),
    ) as PgProvider | undefined;

    if (!pgProviderEnum) {
      this.logger.warn(`지원하지 않는 PG사: ${pg_provider}`);
      return null;
    }

    return pgProviderEnum;
  }

  /**
   * Webhook 서명 검증 및 데이터 파싱
   */
  private async verifyAndParseWebhook(
    pgProviderEnum: PgProvider,
    body: any,
    signature?: string,
    authorization?: string,
  ): Promise<WebhookData | null> {
    const provider = this.pgProviderFactory.getProvider(pgProviderEnum);

    // Webhook 서명 검증
    let isValid: boolean;
    if (pgProviderEnum === PgProvider.BOOTPAY) {
      // Bootpay: receipt_id 기반 검증
      isValid = await provider.verifyWebhook(body);
    } else {
      // 다른 PG사: 헤더 기반 서명 검증
      const signatureToVerify = signature || authorization;
      isValid = await provider.verifyWebhook(body, signatureToVerify);
    }

    if (!isValid) {
      this.logger.warn('Webhook 서명 검증 실패');
      return null;
    }

    // Webhook 데이터 파싱
    return await provider.parseWebhookData(body);
  }

  /**
   * Webhook 데이터 로깅
   */
  private logWebhookData(pg_provider: string, webhookData: WebhookData): void {
    const webhookType = this.resolveWebhookType(
      webhookData.status,
      webhookData.pg_response?.status,
    );

    this.logger.log('========================================');
    this.logger.log(`📩 Webhook 수신: ${webhookType}`);
    this.logger.log(`🔹 PG Provider: ${pg_provider}`);
    this.logger.log(`🔹 Transaction ID: ${webhookData.pg_transaction_id}`);
    this.logger.log(
      `🔹 Status: ${webhookData.status} (Bootpay: ${webhookData.pg_response?.status})`,
    );
    this.logger.log(`🔹 Amount: ${webhookData.amount}원`);
    this.logger.log('========================================');
    this.logger.debug('전체 Webhook 데이터:');
    this.logger.debug(JSON.stringify(webhookData, null, 2));
  }

  /**
   * Webhook 타입 결정
   */
  private resolveWebhookType(status: string, bootpayStatus?: number): string {
    const statusMap: Record<string, string> = {
      success: '결제 완료',
      failed: '결제 실패',
      canceled: '결제 취소',
      pending: '결제 대기',
      expired: '결제 만료',
    };

    if (statusMap[status]) {
      return statusMap[status];
    }

    if (bootpayStatus === 0) {
      return '결제 대기';
    }
    if (bootpayStatus === 2) {
      return '결제 승인 중';
    }
    if (bootpayStatus === -10) {
      return '결제 만료';
    }

    return '알 수 없음';
  }

  /**
   * Webhook 상태에 따른 비즈니스 로직 처리
   */
  private async processWebhookByStatus(
    webhookData: WebhookData,
  ): Promise<void> {
    const lockKey = `webhook:${webhookData.pg_transaction_id}`;
    const acquired = await this.redisService.acquireLock(lockKey, 60);

    if (!acquired) {
      this.logger.warn(
        `Webhook 중복 처리 방지 - TX: ${webhookData.pg_transaction_id}`,
      );
      return;
    }

    try {
      switch (webhookData.status) {
        case 'success':
          await this.handleSuccessWebhook(webhookData);
          break;
        case 'failed':
          await this.handleFailedWebhook(webhookData);
          break;
        case 'canceled':
          await this.handleCanceledWebhook(webhookData);
          break;
        case 'pending':
          await this.handlePendingWebhook(webhookData);
          break;
        case 'expired':
          await this.handleExpiredWebhook(webhookData);
          break;
        default:
          this.logger.warn(`알 수 없는 Webhook 상태: ${webhookData.status}`);
      }
    } finally {
      await this.redisService.releaseLock(lockKey);
    }
  }

  /**
   * 결제 성공 Webhook 처리
   * - PaymentTransaction에서 product_id 조회
   * - 금액 검증
   * - 결제 승인 + 코인 충전 처리
   */
  private async handleSuccessWebhook(webhookData: WebhookData): Promise<void> {
    const transaction =
      await this.paymentTransactionService.findByPgTransactionId(
        webhookData.pg_transaction_id,
      );

    // 금액 검증
    if (transaction.amount !== webhookData.amount) {
      this.logger.error(
        `Webhook 금액 불일치 - 예상: ${transaction.amount}, 수신: ${webhookData.amount}, TX: ${webhookData.pg_transaction_id}`,
      );
      throw new BadRequestException(
        `결제 금액이 일치하지 않습니다. 예상: ${transaction.amount}, 수신: ${webhookData.amount}`,
      );
    }

    // product_id 확인
    if (!transaction.product_id) {
      this.logger.error(
        `product_id 누락 - TX: ${webhookData.pg_transaction_id}`,
      );
      throw new BadRequestException('결제 거래에 상품 정보가 없습니다.');
    }

    await this.paymentTransactionService.processSuccessfulPayment(
      webhookData.pg_transaction_id,
      transaction.product_id,
      webhookData.pg_response,
    );

    this.logger.log(
      `결제 성공 처리 완료 - TX: ${webhookData.pg_transaction_id}, Product: ${transaction.product_id}`,
    );
  }

  /**
   * 결제 실패 Webhook 처리
   */
  private async handleFailedWebhook(webhookData: WebhookData): Promise<void> {
    await this.paymentTransactionService.failPayment(
      webhookData.pg_transaction_id,
      webhookData.pg_response,
    );

    this.logger.log(
      `결제 실패 처리 완료 - TX: ${webhookData.pg_transaction_id}`,
    );
  }

  /**
   * 결제 취소 Webhook 처리
   */
  private async handleCanceledWebhook(webhookData: WebhookData): Promise<void> {
    await this.paymentTransactionService.cancelPayment(
      webhookData.pg_transaction_id,
      webhookData.pg_response,
    );

    this.logger.log(
      `결제 취소 처리 완료 - TX: ${webhookData.pg_transaction_id}`,
    );
  }

  /**
   * 무통장입금 대기 Webhook 처리
   * - 가상계좌 발급 완료, 입금 전 상태
   */
  private async handlePendingWebhook(webhookData: WebhookData): Promise<void> {
    await this.paymentTransactionService.markWaitingDepositPayment(
      webhookData.pg_transaction_id,
      webhookData.pg_response,
    );

    this.logger.log(
      `결제 대기 처리 완료 - TX: ${webhookData.pg_transaction_id}`,
    );
  }

  /**
   * 결제 만료 Webhook 처리
   * - 가상계좌 입금 기한 초과
   */
  private async handleExpiredWebhook(webhookData: WebhookData): Promise<void> {
    await this.paymentTransactionService.expirePayment(
      webhookData.pg_transaction_id,
      webhookData.pg_response,
    );

    this.logger.log(
      `결제 만료 처리 완료 - TX: ${webhookData.pg_transaction_id}`,
    );
  }

  /**
   * 재시도 가능한 에러인지 판별
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;
    const message = error.message || '';
    return (
      error.code === 'P2024' || // Prisma connection pool timeout
      error.code === 'P2028' || // Prisma transaction error
      error.name === 'TimeoutError' ||
      message.includes('ECONNREFUSED') ||
      message.includes('ETIMEDOUT') ||
      message.includes('Redis')
    );
  }
}
