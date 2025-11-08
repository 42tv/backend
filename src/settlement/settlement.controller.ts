import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { SettlementStatus } from '@prisma/client';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';

// DTO 정의
class CreateSettlementDto {
  payout_coin_ids: string[];
  payout_method?: string;
  payout_account?: string;
  admin_memo?: string;
}

class RejectSettlementDto {
  reason: string;
}

@Controller('settlement')
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  // ===== 스트리머 API =====

  /**
   * 정산 요청
   * POST /settlement/my
   */
  @Post('my')
  // @UseGuards(MemberGuard)
  async createMySettlement(
    @Request() req: any,
    @Body() dto: CreateSettlementDto,
  ): Promise<SuccessResponseDto<any>> {
    const streamerIdx = req.user?.idx || 1;

    if (!dto.payout_coin_ids || dto.payout_coin_ids.length === 0) {
      throw new BadRequestException('payout_coin_ids is required');
    }

    const settlement = await this.settlementService.createSettlement(
      streamerIdx,
      dto.payout_coin_ids,
      {
        payout_method: dto.payout_method,
        payout_account: dto.payout_account,
        admin_memo: dto.admin_memo,
      },
    );
    return ResponseWrapper.success(settlement, '정산을 요청했습니다.');
  }

  /**
   * 내 정산 내역 조회
   * GET /settlement/my
   */
  @Get('my')
  // @UseGuards(MemberGuard)
  async getMySettlements(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<SuccessResponseDto<{ settlements: any[] }>> {
    const streamerIdx = req.user?.idx || 1;

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
      streamerIdx,
      {
        status: settlementStatus,
        limit: parsedLimit,
        offset: parsedOffset,
      },
    );
    const take = parsedLimit || 20;
    const pagination = {
      page: Math.floor(parsedOffset / take) + 1,
      limit: take,
      total,
      totalPages: Math.ceil(total / take) || 1,
    };
    return ResponseWrapper.success(
      { settlements: items },
      '정산 내역을 조회했습니다.',
      pagination,
    );
  }

  /**
   * 정산 상세 조회
   * GET /settlement/my/:id
   */
  @Get('my/:id')
  // @UseGuards(MemberGuard)
  async getMySettlementById(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<any>> {
    const streamerIdx = req.user?.idx || 1;
    const settlement = await this.settlementService.findById(id);

    // 본인의 Settlement인지 확인
    if (settlement.streamer_idx !== streamerIdx) {
      throw new BadRequestException('Access denied');
    }

    return ResponseWrapper.success(settlement, '정산 상세를 조회했습니다.');
  }

  /**
   * 내 정산 통계 조회
   * GET /settlement/my/stats
   */
  @Get('my/stats')
  // @UseGuards(MemberGuard)
  async getMySettlementStats(
    @Request() req: any,
  ): Promise<SuccessResponseDto<any>> {
    const streamerIdx = req.user?.idx || 1;

    const stats = await this.settlementService.getSettlementStats(streamerIdx);
    return ResponseWrapper.success(stats, '정산 통계를 조회했습니다.');
  }

  // ===== 관리자 API =====

  /**
   * 모든 정산 내역 조회 (관리자)
   * GET /settlement/admin
   */
  @Get('admin')
  // @UseGuards(AdminGuard)
  async getAllSettlements(
    @Query('status') status?: string,
    @Query('streamerIdx') streamerIdx?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
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
    const { items, total } = await this.settlementService.findAll({
      status: settlementStatus,
      streamerIdx: streamerIdx ? parseInt(streamerIdx, 10) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: parsedLimit,
      offset: parsedOffset,
    });
    const take = parsedLimit || 50;
    const pagination = {
      page: Math.floor(parsedOffset / take) + 1,
      limit: take,
      total,
      totalPages: Math.ceil(total / take) || 1,
    };
    return ResponseWrapper.success(
      { settlements: items },
      '정산 내역을 조회했습니다.',
      pagination,
    );
  }

  /**
   * 승인 대기 중인 정산 목록 조회 (관리자)
   * GET /settlement/admin/pending
   */
  @Get('admin/pending')
  // @UseGuards(AdminGuard)
  async getPendingSettlements(): Promise<SuccessResponseDto<any>> {
    const settlements = await this.settlementService.findPendingSettlements();
    return ResponseWrapper.success(
      settlements,
      '승인 대기 중인 정산을 조회했습니다.',
    );
  }

  /**
   * 정산 상세 조회 (관리자)
   * GET /settlement/admin/:id
   */
  @Get('admin/:id')
  // @UseGuards(AdminGuard)
  async getSettlementById(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<any>> {
    const settlement = await this.settlementService.findById(id);
    return ResponseWrapper.success(settlement, '정산 상세를 조회했습니다.');
  }

  /**
   * 정산 승인 (관리자)
   * POST /settlement/admin/:id/approve
   */
  @Post('admin/:id/approve')
  // @UseGuards(AdminGuard)
  async approveSettlement(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<any>> {
    const settlement = await this.settlementService.approveSettlement(id);
    return ResponseWrapper.success(settlement, '정산을 승인했습니다.');
  }

  /**
   * 정산 지급 완료 처리 (관리자)
   * POST /settlement/admin/:id/pay
   */
  @Post('admin/:id/pay')
  // @UseGuards(AdminGuard)
  async markSettlementAsPaid(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<any>> {
    const settlement = await this.settlementService.markSettlementAsPaid(id);
    return ResponseWrapper.success(
      settlement,
      '정산을 지급 완료 처리했습니다.',
    );
  }

  /**
   * 정산 거절 (관리자)
   * POST /settlement/admin/:id/reject
   */
  @Post('admin/:id/reject')
  // @UseGuards(AdminGuard)
  async rejectSettlement(
    @Param('id') id: string,
    @Body() dto: RejectSettlementDto,
  ): Promise<SuccessResponseDto<any>> {
    if (!dto.reason) {
      throw new BadRequestException('reason is required');
    }

    const settlement = await this.settlementService.rejectSettlement(
      id,
      dto.reason,
    );
    return ResponseWrapper.success(settlement, '정산을 거절했습니다.');
  }

  /**
   * 특정 스트리머의 정산 내역 조회 (관리자)
   * GET /settlement/admin/streamers/:streamerIdx
   */
  @Get('admin/streamers/:streamerIdx')
  // @UseGuards(AdminGuard)
  async getStreamerSettlements(
    @Param('streamerIdx', ParseIntPipe) streamerIdx: number,
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
      streamerIdx,
      {
        status: settlementStatus,
        limit: parsedLimit,
        offset: parsedOffset,
      },
    );
    const take = parsedLimit || 20;
    const pagination = {
      page: Math.floor(parsedOffset / take) + 1,
      limit: take,
      total,
      totalPages: Math.ceil(total / take) || 1,
    };
    return ResponseWrapper.success(
      { settlements: items },
      '스트리머 정산 내역을 조회했습니다.',
      pagination,
    );
  }

  /**
   * 정산 통계 조회 (관리자)
   * GET /settlement/admin/streamers/:streamerIdx/stats
   */
  @Get('admin/streamers/:streamerIdx/stats')
  // @UseGuards(AdminGuard)
  async getStreamerSettlementStats(
    @Param('streamerIdx', ParseIntPipe) streamerIdx: number,
  ): Promise<SuccessResponseDto<any>> {
    const stats = await this.settlementService.getSettlementStats(streamerIdx);
    return ResponseWrapper.success(stats, '스트리머 정산 통계를 조회했습니다.');
  }
}
