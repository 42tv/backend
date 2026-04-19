import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PayoutCoinService } from './payout-coin.service';
import { PayoutStatus } from '@prisma/client';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';

@Controller('payout-coin')
@UseGuards(MemberGuard)
export class PayoutCoinController {
  constructor(private readonly payoutCoinService: PayoutCoinService) {}

  @Get('summary')
  async getSummary(@Request() req: any): Promise<SuccessResponseDto<any>> {
    const summary = await this.payoutCoinService.getPayoutSummary(req.user.idx);
    return ResponseWrapper.success(summary, '정산 요약을 조회했습니다.');
  }

  @Get('matured')
  async getMaturedCoins(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<SuccessResponseDto<{ payoutCoins: any[] }>> {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    const { items, total } =
      await this.payoutCoinService.getMaturedCoinsForSettlement(req.user.idx, {
        limit: parsedLimit,
        offset: parsedOffset,
      });

    const take = parsedLimit || 100;
    return ResponseWrapper.success(
      { payoutCoins: items },
      '정산 가능한 코인을 조회했습니다.',
      {
        page: Math.floor(parsedOffset / take) + 1,
        limit: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    );
  }

  @Get()
  async getPayoutCoins(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
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
      req.user.idx,
      {
        status: payoutStatus,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: parsedLimit,
        offset: parsedOffset,
      },
    );

    const take = parsedLimit || 50;
    return ResponseWrapper.success(
      { payoutCoins: items },
      'PayoutCoin 목록을 조회했습니다.',
      {
        page: Math.floor(parsedOffset / take) + 1,
        limit: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    );
  }

  @Get(':id')
  async getPayoutCoinById(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<any>> {
    const payoutCoin = await this.payoutCoinService.findById(id);

    if (payoutCoin.streamer_idx !== req.user.idx) {
      throw new BadRequestException('Access denied');
    }

    return ResponseWrapper.success(payoutCoin, '코인 상세를 조회했습니다.');
  }
}
