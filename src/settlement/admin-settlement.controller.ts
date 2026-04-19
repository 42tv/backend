import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { SettlementStatus } from '@prisma/client';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { AdminGuard } from 'src/auth/guard/admin.guard';

class RejectSettlementDto {
  reason: string;
}

@Controller('admin/settlement')
@UseGuards(AdminGuard)
export class AdminSettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Get()
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

  @Get('pending')
  async getPendingSettlements(): Promise<SuccessResponseDto<any>> {
    const settlements = await this.settlementService.findPendingSettlements();
    return ResponseWrapper.success(
      settlements,
      '승인 대기 중인 정산을 조회했습니다.',
    );
  }

  @Get('streamers/:streamerIdx')
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
      { status: settlementStatus, limit: parsedLimit, offset: parsedOffset },
    );

    const take = parsedLimit || 20;
    return ResponseWrapper.success(
      { settlements: items },
      '스트리머 정산 내역을 조회했습니다.',
      {
        page: Math.floor(parsedOffset / take) + 1,
        limit: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    );
  }

  @Get('streamers/:streamerIdx/stats')
  async getStreamerStats(
    @Param('streamerIdx', ParseIntPipe) streamerIdx: number,
  ): Promise<SuccessResponseDto<any>> {
    const stats = await this.settlementService.getSettlementStats(streamerIdx);
    return ResponseWrapper.success(stats, '스트리머 정산 통계를 조회했습니다.');
  }

  @Get(':id')
  async getSettlementById(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<any>> {
    const settlement = await this.settlementService.findById(id);
    return ResponseWrapper.success(settlement, '정산 상세를 조회했습니다.');
  }

  @Post(':id/approve')
  async approveSettlement(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<any>> {
    const settlement = await this.settlementService.approveSettlement(id);
    return ResponseWrapper.success(settlement, '정산을 승인했습니다.');
  }

  @Post(':id/pay')
  async markSettlementAsPaid(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<any>> {
    const settlement = await this.settlementService.markSettlementAsPaid(id);
    return ResponseWrapper.success(
      settlement,
      '정산을 지급 완료 처리했습니다.',
    );
  }

  @Post(':id/reject')
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
}
