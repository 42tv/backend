import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Request,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { PayoutCoinService } from './payout-coin.service';
import { PayoutStatus } from '@prisma/client';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';

@Controller('payout-coin')
export class PayoutCoinController {
  constructor(private readonly payoutCoinService: PayoutCoinService) {}

  /**
   * 스트리머의 정산 요약 조회
   * GET /payout-coin/my/summary
   */
  @Get('my/summary')
  // @UseGuards(MemberGuard) // TODO: 인증 가드 추가
  async getMyPayoutSummary(
    @Request() req: any,
  ): Promise<SuccessResponseDto<any>> {
    const streamerIdx = req.user?.idx || 1; // TODO: 실제 인증에서 가져오기

    const summary = await this.payoutCoinService.getPayoutSummary(streamerIdx);
    return ResponseWrapper.success(summary, '정산 요약을 조회했습니다.');
  }

  /**
   * 스트리머의 PayoutCoin 목록 조회
   * GET /payout-coin/my
   */
  @Get('my')
  // @UseGuards(MemberGuard)
  async getMyPayoutCoins(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<SuccessResponseDto<{ payoutCoins: any[] }>> {
    const streamerIdx = req.user?.idx || 1;

    // 상태 파싱
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
      {
        status: payoutStatus,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: parsedLimit,
        offset: parsedOffset,
      },
    );

    const take = parsedLimit || 50;
    const pagination = {
      page: Math.floor(parsedOffset / take) + 1,
      limit: take,
      total,
      totalPages: Math.ceil(total / take) || 1,
    };

    return ResponseWrapper.success(
      { payoutCoins: items },
      'PayoutCoin 목록을 조회했습니다.',
      pagination,
    );
  }

  /**
   * PayoutCoin 상세 조회
   * GET /payout-coin/my/:id
   */
  @Get('my/:id')
  // @UseGuards(MemberGuard)
  async getMyPayoutCoinById(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<any>> {
    const streamerIdx = req.user?.idx || 1;
    const payoutCoin = await this.payoutCoinService.findById(id);

    // 본인의 PayoutCoin인지 확인
    if (payoutCoin.streamer_idx !== streamerIdx) {
      throw new BadRequestException('Access denied');
    }

    return ResponseWrapper.success(payoutCoin, '정산 코인을 조회했습니다.');
  }

  /**
   * 정산 가능한 PayoutCoin 목록 조회
   * GET /payout-coin/my/matured
   */
  @Get('my/matured')
  // @UseGuards(MemberGuard)
  async getMyMaturedCoins(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<SuccessResponseDto<{ payoutCoins: any[] }>> {
    const streamerIdx = req.user?.idx || 1;

    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    const { items, total } =
      await this.payoutCoinService.getMaturedCoinsForSettlement(streamerIdx, {
        limit: parsedLimit,
        offset: parsedOffset,
      });

    const take = parsedLimit || 100;
    const pagination = {
      page: Math.floor(parsedOffset / take) + 1,
      limit: take,
      total,
      totalPages: Math.ceil(total / take) || 1,
    };

    return ResponseWrapper.success(
      { payoutCoins: items },
      '정산 가능한 PayoutCoin을 조회했습니다.',
      pagination,
    );
  }

  /**
   * 차단된 PayoutCoin 목록 조회
   * GET /payout-coin/my/blocked
   */
  @Get('my/blocked')
  // @UseGuards(MemberGuard)
  async getMyBlockedCoins(
    @Request() req: any,
  ): Promise<SuccessResponseDto<any>> {
    const streamerIdx = req.user?.idx || 1;

    const coins = await this.payoutCoinService.findBlockedCoins(streamerIdx);
    return ResponseWrapper.success(coins, '차단된 PayoutCoin을 조회했습니다.');
  }

  /**
   * 대기 중인 PayoutCoin 목록 조회
   * GET /payout-coin/my/pending
   */
  @Get('my/pending')
  // @UseGuards(MemberGuard)
  async getMyPendingCoins(
    @Request() req: any,
  ): Promise<SuccessResponseDto<any>> {
    const streamerIdx = req.user?.idx || 1;

    const coins = await this.payoutCoinService.findPendingCoins(streamerIdx);
    return ResponseWrapper.success(
      coins,
      '대기 중인 PayoutCoin을 조회했습니다.',
    );
  }

  /**
   * 정산 가능 금액 조회
   * GET /payout-coin/my/matured-amount
   */
  @Get('my/matured-amount')
  // @UseGuards(MemberGuard)
  async getMyMaturedAmount(
    @Request() req: any,
  ): Promise<
    SuccessResponseDto<{ streamer_idx: number; matured_amount: number }>
  > {
    const streamerIdx = req.user?.idx || 1;

    const amount =
      await this.payoutCoinService.getTotalMaturedAmount(streamerIdx);

    return ResponseWrapper.success(
      { streamer_idx: streamerIdx, matured_amount: amount },
      '정산 가능 금액을 조회했습니다.',
    );
  }

  // ===== 관리자 API =====

  /**
   * 특정 스트리머의 PayoutCoin 조회 (관리자)
   * GET /payout-coin/admin/streamers/:streamerIdx
   */
  @Get('admin/streamers/:streamerIdx')
  // @UseGuards(AdminGuard)
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
      {
        status: payoutStatus,
        limit: parsedLimit,
        offset: parsedOffset,
      },
    );

    const take = parsedLimit || 50;
    const pagination = {
      page: Math.floor(parsedOffset / take) + 1,
      limit: take,
      total,
      totalPages: Math.ceil(total / take) || 1,
    };

    return ResponseWrapper.success(
      { payoutCoins: items },
      '스트리머의 PayoutCoin을 조회했습니다.',
      pagination,
    );
  }

  /**
   * PayoutCoin 차단 해제 (관리자)
   * POST /payout-coin/admin/:id/unblock
   */
  @Post('admin/:id/unblock')
  // @UseGuards(AdminGuard)
  async unblockPayoutCoin(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<any>> {
    const result = await this.payoutCoinService.unblockPayoutCoin(id);
    return ResponseWrapper.success(result, 'PayoutCoin 차단을 해제했습니다.');
  }

  /**
   * PayoutCoin 상세 조회 (관리자)
   * GET /payout-coin/admin/:id
   */
  @Get('admin/:id')
  // @UseGuards(AdminGuard)
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
