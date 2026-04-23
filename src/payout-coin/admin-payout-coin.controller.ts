import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { PayoutCoinService } from './payout-coin.service';
import { PayoutStatus } from '@prisma/client';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { AdminGuard } from 'src/auth/guard/admin.guard';

@Controller('admin/payout-coin')
@UseGuards(AdminGuard)
export class AdminPayoutCoinController {
  constructor(private readonly payoutCoinService: PayoutCoinService) {}

  @Get('streamers/:streamerIdx')
  async getStreamerPayoutCoins(
    @Param('streamerIdx', ParseIntPipe) streamerIdx: number,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<SuccessResponseDto<{ payoutCoins: any[] }>> {
    let payoutStatus: PayoutStatus | undefined;
    if (
      status &&
      Object.values(PayoutStatus).includes(status as PayoutStatus)
    ) {
      payoutStatus = status as PayoutStatus;
    }

    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    const { items, total } = await this.payoutCoinService.findByStreamerIdx(
      streamerIdx,
      { status: payoutStatus, limit: parsedLimit, offset: parsedOffset },
    );

    const take = parsedLimit || 50;
    return ResponseWrapper.success(
      { payoutCoins: items },
      '스트리머의 PayoutCoin을 조회했습니다.',
      {
        page: Math.floor(parsedOffset / take) + 1,
        limit: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    );
  }

  @Post('mature')
  async triggerMaturity(): Promise<SuccessResponseDto<any>> {
    const result = await this.payoutCoinService.maturePendingCoins();
    return ResponseWrapper.success(
      result,
      'PayoutCoin 성숙도를 업데이트했습니다.',
    );
  }

  @Post(':id/unblock')
  async unblockPayoutCoin(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<any>> {
    const result = await this.payoutCoinService.unblockPayoutCoin(id);
    return ResponseWrapper.success(result, 'PayoutCoin 차단을 해제했습니다.');
  }

  @Get(':id')
  async getPayoutCoinById(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<any>> {
    const payoutCoin = await this.payoutCoinService.findById(id);
    return ResponseWrapper.success(
      payoutCoin,
      'PayoutCoin 상세를 조회했습니다.',
    );
  }
}
