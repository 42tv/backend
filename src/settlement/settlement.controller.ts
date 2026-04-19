import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { SettlementStatus } from '@prisma/client';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';

class RequestSettlementDto {
  amount: number;
  payout_method?: string;
  payout_account?: string;
}

@Controller('settlement')
@UseGuards(MemberGuard)
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Post()
  async requestSettlement(
    @Request() req: any,
    @Body() dto: RequestSettlementDto,
  ): Promise<SuccessResponseDto<any>> {
    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('amount must be greater than 0');
    }

    const settlement = await this.settlementService.requestSettlement(
      req.user.idx,
      dto.amount,
      {
        payout_method: dto.payout_method,
        payout_account: dto.payout_account,
      },
    );
    return ResponseWrapper.success(settlement, '정산을 신청했습니다.');
  }

  @Get()
  async getSettlements(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<SuccessResponseDto<{ settlements: any[] }>> {
    let settlementStatus: SettlementStatus | undefined;
    if (
      status &&
      Object.values(SettlementStatus).includes(status as SettlementStatus)
    ) {
      settlementStatus = status as SettlementStatus;
    }

    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    const { items, total } = await this.settlementService.findByStreamerIdx(
      req.user.idx,
      { status: settlementStatus, limit: parsedLimit, offset: parsedOffset },
    );

    const take = parsedLimit || 20;
    return ResponseWrapper.success(
      { settlements: items },
      '정산 내역을 조회했습니다.',
      {
        page: Math.floor(parsedOffset / take) + 1,
        limit: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    );
  }

  @Get('stats')
  async getSettlementStats(
    @Request() req: any,
  ): Promise<SuccessResponseDto<any>> {
    const stats = await this.settlementService.getSettlementStats(req.user.idx);
    return ResponseWrapper.success(stats, '정산 통계를 조회했습니다.');
  }

  @Get(':id')
  async getSettlementById(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<any>> {
    const settlement = await this.settlementService.findById(id);

    if (settlement.streamer_idx !== req.user.idx) {
      throw new BadRequestException('Access denied');
    }

    return ResponseWrapper.success(settlement, '정산 상세를 조회했습니다.');
  }
}
