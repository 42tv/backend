import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { CoinTopupService } from './coin-topup.service';
import { AdminGuard } from '../auth/guard/admin.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';

@Controller('admin/coin-topup')
@UseGuards(AdminGuard)
export class AdminCoinTopupController {
  constructor(private readonly coinTopupService: CoinTopupService) {}

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
    @Param('topup_id') topup_id: string,
  ): Promise<SuccessResponseDto<any>> {
    const refund = await this.coinTopupService.processRefund(topup_id);
    return ResponseWrapper.success(refund, '코인 환불을 처리했습니다.');
  }
}
