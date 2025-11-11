import { Controller, Get, UseGuards } from '@nestjs/common';
import { CoinBalanceService } from './coin-balance.service';
import { MemberGuard } from '../auth/guard/jwt.member.guard';
import { AdminGuard } from '../auth/guard/admin.guard';
import { GetUser } from '../auth/get-user.decorator';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';

@Controller('coin-balance')
export class CoinBalanceController {
  constructor(private readonly coinBalanceService: CoinBalanceService) {}

  @Get('me')
  @UseGuards(MemberGuard)
  async getMyCoinBalance(
    @GetUser() user: { user_idx: number },
  ): Promise<SuccessResponseDto<any>> {
    const balance = await this.coinBalanceService.getCoinBalance(user.user_idx);
    return ResponseWrapper.success(balance, '코인 잔액을 조회했습니다.');
  }

  @Get('stats')
  @UseGuards(AdminGuard)
  async getCoinStats(): Promise<SuccessResponseDto<any>> {
    const stats = await this.coinBalanceService.getCoinStats();
    return ResponseWrapper.success(stats, '코인 통계를 조회했습니다.');
  }
}
