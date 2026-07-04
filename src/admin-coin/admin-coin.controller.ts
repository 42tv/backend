import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { AdminCoinService } from './admin-coin.service';
import { AdminCoinAdjustDto } from './dto/admin-coin.dto';

@Controller('admin/coins')
@UseGuards(AdminGuard)
export class AdminCoinController {
  constructor(private readonly adminCoinService: AdminCoinService) {}

  @Get()
  async getBalances(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<SuccessResponseDto<{ balances: any[] }>> {
    const take = limit ? parseInt(limit, 10) : 20;
    const currentPage = page ? parseInt(page, 10) : 1;

    const { items, total } = await this.adminCoinService.findBalances({
      search,
      limit: take,
      offset: (currentPage - 1) * take,
    });

    return ResponseWrapper.success(
      { balances: items },
      '코인 잔액 목록을 조회했습니다.',
      {
        page: currentPage,
        limit: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    );
  }

  @Get(':userIdx/history')
  async getHistory(
    @Param('userIdx', ParseIntPipe) userIdx: number,
    @Query('limit') limit?: string,
  ): Promise<SuccessResponseDto<any>> {
    const take = limit ? parseInt(limit, 10) : 50;
    const history = await this.adminCoinService.findHistory(userIdx, take);
    return ResponseWrapper.success(history, '코인 이력을 조회했습니다.');
  }

  @Post(':userIdx/grant')
  async grantCoins(
    @Req() req,
    @Param('userIdx', ParseIntPipe) userIdx: number,
    @Body() dto: AdminCoinAdjustDto,
  ): Promise<SuccessResponseDto<any>> {
    const result = await this.adminCoinService.grantCoins(
      req.user.idx,
      userIdx,
      dto.amount,
      dto.reason,
      dto.idempotencyKey,
    );
    return ResponseWrapper.success(result, '코인을 지급했습니다.');
  }

  @Post(':userIdx/revoke')
  async revokeCoins(
    @Req() req,
    @Param('userIdx', ParseIntPipe) userIdx: number,
    @Body() dto: AdminCoinAdjustDto,
  ): Promise<SuccessResponseDto<any>> {
    const result = await this.adminCoinService.revokeCoins(
      req.user.idx,
      userIdx,
      dto.amount,
      dto.reason,
      dto.idempotencyKey,
    );
    return ResponseWrapper.success(result, '코인을 회수했습니다.');
  }
}
