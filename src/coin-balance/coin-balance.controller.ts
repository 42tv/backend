import { Controller, Get, UseGuards } from '@nestjs/common';
import { CoinBalanceService } from './coin-balance.service';
import { AdminGuard } from '../auth/guard/admin.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';

@Controller('coin-balance')
export class CoinBalanceController {
  constructor(private readonly coinBalanceService: CoinBalanceService) {}

  @Get('stats')
  @UseGuards(AdminGuard)
  async getCoinStats(): Promise<SuccessResponseDto<any>> {
    const stats = await this.coinBalanceService.getCoinStats();
    return ResponseWrapper.success(stats, '코인 통계를 조회했습니다.');
  }
}
