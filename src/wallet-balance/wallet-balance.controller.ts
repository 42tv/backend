import { Controller, Get, UseGuards } from '@nestjs/common';
import { WalletBalanceService } from './wallet-balance.service';
import { MemberGuard } from '../auth/guard/jwt.member.guard';
import { AdminGuard } from '../auth/guard/admin.guard';
import { GetUser } from '../auth/get-user.decorator';

@Controller('wallet-balance')
export class WalletBalanceController {
  constructor(private readonly walletBalanceService: WalletBalanceService) {}

  @Get('me')
  @UseGuards(MemberGuard)
  async getMyWalletBalance(@GetUser() user: { user_idx: number }) {
    return await this.walletBalanceService.getOrCreateWalletBalance(
      user.user_idx,
    );
  }

  @Get('stats')
  @UseGuards(AdminGuard)
  async getWalletStats() {
    return await this.walletBalanceService.getWalletStats();
  }
}
