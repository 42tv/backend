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
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';

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
  ): Promise<SuccessResponseDto<any>> {
    const purchase = await this.paymentTransactionService.purchaseProduct(
      user.idx,
      purchaseDto.product_id,
      purchaseDto.pg_provider, // PG사 선택 (기본값: MOCK)
    );
    return ResponseWrapper.success(purchase, '상품 결제를 시작했습니다.');
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
  ): Promise<SuccessResponseDto<any>> {
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
        const result =
          await this.paymentTransactionService.processSuccessfulPayment(
            webhookData.pg_transaction_id,
            body.product_id, // PG사마다 다를 수 있으므로 body에서 직접 추출
            webhookData.pg_response,
          );
        return ResponseWrapper.success(
          result,
          'Webhook 결제를 성공 처리했습니다.',
        );

      case 'failed':
        // 결제 실패
        const failed = await this.paymentTransactionService.failPayment(
          webhookData.pg_transaction_id,
          webhookData.pg_response,
        );
        return ResponseWrapper.success(
          failed,
          'Webhook 결제를 실패 처리했습니다.',
        );

      case 'canceled':
        // 결제 취소
        const canceled = await this.paymentTransactionService.cancelPayment(
          webhookData.pg_transaction_id,
          webhookData.pg_response,
        );
        return ResponseWrapper.success(
          canceled,
          'Webhook 결제를 취소했습니다.',
        );

      default:
        throw new BadRequestException(
          `알 수 없는 결제 상태: ${webhookData.status}`,
        );
    }
  }
}
