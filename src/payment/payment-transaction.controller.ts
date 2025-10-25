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
  BadRequestException,
} from '@nestjs/common';
import { PaymentTransactionService } from './payment-transaction.service';
import { CreatePaymentTransactionDto } from './dto/create-payment-transaction.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PurchaseProductDto } from './dto/purchase-product.dto';
import { MemberGuard } from '../auth/guard/jwt.member.guard';
import { GetUser } from '../auth/get-user.decorator';
import { PgProviderFactory } from './pg-providers/pg-provider.factory';
import { PgProvider } from './dto/create-payment-transaction.dto';

@Controller('payments')
export class PaymentTransactionController {
  constructor(
    private readonly paymentTransactionService: PaymentTransactionService,
    private readonly pgProviderFactory: PgProviderFactory,
  ) {}

  @Post('purchase')
  @UseGuards(MemberGuard)
  async purchaseProduct(
    @GetUser() user,
    @Body() purchaseDto: PurchaseProductDto,
  ) {
    return await this.paymentTransactionService.purchaseProduct(
      user.idx,
      purchaseDto.product_id,
      purchaseDto.pg_provider, // PG사 선택 (기본값: MOCK)
    );
  }

  @Post()
  @UseGuards(MemberGuard)
  async create(
    @GetUser() user: { user_idx: number },
    @Body() createDto: CreatePaymentTransactionDto,
  ) {
    return await this.paymentTransactionService.create(
      user.user_idx,
      createDto,
    );
  }

  @Post('success')
  async processSuccessfulPayment(
    @Body('pg_transaction_id') pg_transaction_id: string,
    @Body('product_id', ParseIntPipe) product_id: number,
    @Body('pg_response') pg_response?: any,
  ) {
    return await this.paymentTransactionService.processSuccessfulPayment(
      pg_transaction_id,
      product_id,
      pg_response,
    );
  }

  @Post('approve')
  async approvePayment(@Body() updateDto: UpdatePaymentStatusDto) {
    return await this.paymentTransactionService.approvePayment(
      updateDto.pg_transaction_id,
      updateDto.pg_response,
    );
  }

  @Post('fail')
  async failPayment(@Body() updateDto: UpdatePaymentStatusDto) {
    return await this.paymentTransactionService.failPayment(
      updateDto.pg_transaction_id,
      updateDto.pg_response,
    );
  }

  @Post('cancel')
  async cancelPayment(@Body() updateDto: UpdatePaymentStatusDto) {
    return await this.paymentTransactionService.cancelPayment(
      updateDto.pg_transaction_id,
      updateDto.pg_response,
    );
  }

  @Get('pg/:pg_transaction_id')
  async findByPgTransactionId(
    @Param('pg_transaction_id') pg_transaction_id: string,
  ) {
    return await this.paymentTransactionService.findByPgTransactionId(
      pg_transaction_id,
    );
  }

  @Get('me')
  @UseGuards(MemberGuard)
  async getMyTransactions(
    @GetUser() user: { user_idx: number },
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return await this.paymentTransactionService.findByUserId(
      user.user_idx,
      limit,
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.paymentTransactionService.findById(id);
  }

  /**
   * PG사별 Webhook 엔드포인트
   * - PG사에서 결제 결과를 전송하는 엔드포인트
   * - 각 PG사의 Webhook 설정에 이 URL을 등록해야 함
   * @param pg_provider PG사 종류 (inicis, toss, kakaopay)
   * @param body Webhook 요청 body
   * @param signature PG사 서명 (헤더에서 추출)
   */
  @Post('webhook/:pg_provider')
  async handleWebhook(
    @Param('pg_provider') pg_provider: string,
    @Body() body: any,
    @Headers('x-signature') signature?: string,
    @Headers('authorization') authorization?: string,
  ) {
    // PG Provider 검증
    let pgProviderEnum: PgProvider;
    switch (pg_provider.toLowerCase()) {
      case 'mock':
        pgProviderEnum = PgProvider.MOCK;
        break;
      case 'toss':
        pgProviderEnum = PgProvider.TOSS;
        break;
      case 'inicis':
        pgProviderEnum = PgProvider.INICIS;
        break;
      case 'kakaopay':
        pgProviderEnum = PgProvider.KAKAOPAY;
        break;
      default:
        throw new BadRequestException(`지원하지 않는 PG사: ${pg_provider}`);
    }

    // PG Provider 가져오기
    const provider = this.pgProviderFactory.getProvider(pgProviderEnum);

    // 1. Webhook 서명 검증
    const signatureToVerify = signature || authorization;
    const isValid = await provider.verifyWebhook(body, signatureToVerify);

    if (!isValid) {
      throw new BadRequestException('Webhook 서명 검증 실패');
    }

    // 2. Webhook 데이터 파싱
    const webhookData = await provider.parseWebhookData(body);

    // 3. 결제 상태에 따라 처리
    switch (webhookData.status) {
      case 'success':
        // 결제 성공: 코인 충전 처리
        return await this.paymentTransactionService.processSuccessfulPayment(
          webhookData.pg_transaction_id,
          body.product_id, // PG사마다 다를 수 있으므로 body에서 직접 추출
          webhookData.pg_response,
        );

      case 'failed':
        // 결제 실패
        return await this.paymentTransactionService.failPayment(
          webhookData.pg_transaction_id,
          webhookData.pg_response,
        );

      case 'canceled':
        // 결제 취소
        return await this.paymentTransactionService.cancelPayment(
          webhookData.pg_transaction_id,
          webhookData.pg_response,
        );

      default:
        throw new BadRequestException(
          `알 수 없는 결제 상태: ${webhookData.status}`,
        );
    }
  }
}
