import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaymentTransactionStatus } from '@prisma/client';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { PaymentTransactionRepository } from './payment-transaction.repository';

@Controller('admin/payments')
@UseGuards(AdminGuard)
export class AdminPaymentController {
  constructor(
    private readonly paymentTransactionRepository: PaymentTransactionRepository,
  ) {}

  @Get()
  async getPayments(
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('userIdx') userIdx?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<SuccessResponseDto<{ payments: any[] }>> {
    const take = limit ? parseInt(limit, 10) : 20;
    const currentPage = page ? parseInt(page, 10) : 1;

    const { items, total } =
      await this.paymentTransactionRepository.findAllAdmin({
        status:
          status &&
          Object.values(PaymentTransactionStatus).includes(
            status as PaymentTransactionStatus,
          )
            ? (status as PaymentTransactionStatus)
            : undefined,
        method,
        userIdx: userIdx ? parseInt(userIdx, 10) : undefined,
        search,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: take,
        offset: (currentPage - 1) * take,
      });

    // 프론트 목록 행(AdminPaymentTransaction) 형태로 평탄화
    const payments = items.map((payment) => {
      const topup = payment.topups[0] ?? null;
      const bootpay = topup?.bootpayTransaction ?? null;
      return {
        id: payment.id,
        transaction_id: payment.pg_transaction_id,
        topup_id: topup?.id ?? null,
        topup_status: topup?.status ?? null,
        user_idx: payment.user?.idx ?? null,
        user_id: payment.user?.user_id ?? null,
        nickname: payment.user?.nickname ?? null,
        product_name: topup?.product_name ?? null,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.payment_method,
        method_symbol: bootpay?.method_symbol ?? null,
        status: payment.status,
        pg: bootpay?.pg ?? payment.pg_provider,
        receipt_url: bootpay?.receipt_url ?? null,
        requested_at: payment.requested_at,
        paid_at: payment.paid_at,
        canceled_at: payment.canceled_at,
      };
    });

    return ResponseWrapper.success({ payments }, '결제 내역을 조회했습니다.', {
      page: currentPage,
      limit: take,
      total,
      totalPages: Math.ceil(total / take) || 1,
    });
  }

  @Get(':transactionId')
  async getPaymentDetail(
    @Param('transactionId') transactionId: string,
  ): Promise<SuccessResponseDto<any>> {
    const payment =
      await this.paymentTransactionRepository.findDetailAdmin(transactionId);
    if (!payment) {
      throw new NotFoundException('결제 거래를 찾을 수 없습니다.');
    }
    return ResponseWrapper.success(payment, '결제 상세를 조회했습니다.');
  }
}
