import { Controller, Get, UseGuards } from '@nestjs/common';
import { CoinBalanceService } from './coin-balance.service';
import { MemberGuard } from '../auth/guard/jwt.member.guard';
import { AdminGuard } from '../auth/guard/admin.guard';
import { GetUser } from '../auth/get-user.decorator';

@Controller('coin-balance')
export class CoinBalanceController {
  constructor(private readonly coinBalanceService: CoinBalanceService) {}

  @Get('me')
  @UseGuards(MemberGuard)
  async getMyCoinBalance(@GetUser() user: { user_idx: number }) {
    return await this.coinBalanceService.getCoinBalance(user.user_idx);
  }

  @Get('stats')
  @UseGuards(AdminGuard)
  async getCoinStats() {
    return await this.coinBalanceService.getCoinStats();
  }
}
