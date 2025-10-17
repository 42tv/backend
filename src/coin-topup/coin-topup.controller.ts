import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { CoinTopupService } from './coin-topup.service';
import { ProcessTopupDto } from './dto/create-coin-topup.dto';
import { MemberGuard } from '../auth/guard/jwt.member.guard';
import { AdminGuard } from '../auth/guard/admin.guard';
import { GetUser } from '../auth/get-user.decorator';

@Controller('coin-topups')
export class CoinTopupController {
  constructor(private readonly coinTopupService: CoinTopupService) {}

  @Post('process')
  @UseGuards(MemberGuard)
  async processTopup(
    @GetUser() user: { user_idx: number },
    @Body() processDto: ProcessTopupDto,
  ) {
    return await this.coinTopupService.processTopup(user.user_idx, processDto);
  }

  @Post(':transaction_id/fail')
  @UseGuards(AdminGuard)
  async failTopup(@Param('transaction_id') transaction_id: string) {
    return await this.coinTopupService.failTopup(transaction_id);
  }

  @Post(':topup_id/refund')
  @UseGuards(AdminGuard)
  async processRefund(@Param('topup_id') topup_id: string) {
    return await this.coinTopupService.processRefund(topup_id);
  }

  @Get('me')
  @UseGuards(MemberGuard)
  async getMyTopups(
    @GetUser() user: { user_idx: number },
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return await this.coinTopupService.findByUserId(user.user_idx, limit);
  }

  @Get('me/available')
  @UseGuards(MemberGuard)
  async getAvailableTopups(@GetUser() user: { user_idx: number }) {
    return await this.coinTopupService.getAvailableTopups(user.user_idx);
  }

  @Get('me/stats')
  @UseGuards(MemberGuard)
  async getMyTopupStats(@GetUser() user: { user_idx: number }) {
    return await this.coinTopupService.getTopupStats(user.user_idx);
  }

  @Get(':id')
  @UseGuards(MemberGuard)
  async findById(@Param('id') id: string) {
    return await this.coinTopupService.findById(id);
  }
}
