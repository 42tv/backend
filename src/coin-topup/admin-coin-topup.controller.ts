import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TopupStatus } from '@prisma/client';
import { CoinTopupService } from './coin-topup.service';
import { AdminGuard } from '../auth/guard/admin.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { RefundTopupDto } from './dto/refund-topup.dto';

@Controller('admin/coin-topup')
@UseGuards(AdminGuard)
export class AdminCoinTopupController {
  constructor(private readonly coinTopupService: CoinTopupService) {}

  @Get()
  async getTopups(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<SuccessResponseDto<{ topups: any[] }>> {
    const take = limit ? parseInt(limit, 10) : 20;
    const currentPage = page ? parseInt(page, 10) : 1;

    const { items, total } = await this.coinTopupService.findAllForAdmin({
      status:
        status && Object.values(TopupStatus).includes(status as TopupStatus)
          ? (status as TopupStatus)
          : undefined,
      search,
      limit: take,
      offset: (currentPage - 1) * take,
    });

    return ResponseWrapper.success(
      { topups: items },
      '충전 내역 목록을 조회했습니다.',
      {
        page: currentPage,
        limit: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    );
  }

  // :transaction_id 등 와일드카드 라우트보다 위에 선언해야 함
  @Get('stats')
  async getStats(): Promise<SuccessResponseDto<any>> {
    const stats = await this.coinTopupService.getAdminPaymentStats();
    return ResponseWrapper.success(stats, '결제/정산 통계를 조회했습니다.');
  }

  @Post(':transaction_id/fail')
  async failTopup(
    @Param('transaction_id') transaction_id: string,
  ): Promise<SuccessResponseDto<any>> {
    const result = await this.coinTopupService.failTopup(transaction_id);
    return ResponseWrapper.success(
      result,
      '충전 트랜잭션을 실패 처리했습니다.',
    );
  }

  @Post(':topup_id/refund')
  async processRefund(
    @Req() req,
    @Param('topup_id') topup_id: string,
    @Body() dto: RefundTopupDto,
  ): Promise<SuccessResponseDto<any>> {
    const refund = await this.coinTopupService.processRefund(
      topup_id,
      req.user.idx,
      dto.reason,
    );
    return ResponseWrapper.success(refund, '코인 환불을 처리했습니다.');
  }
}
