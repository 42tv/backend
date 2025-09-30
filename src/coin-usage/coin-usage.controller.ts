import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { CoinUsageService } from './coin-usage.service';
import { UseCoinDto } from './dto/use-coin.dto';
import { MemberGuard } from '../auth/guard/jwt.member.guard';
import { GetUser } from '../auth/get-user.decorator';

@Controller('coin-usage')
export class CoinUsageController {
  constructor(private readonly coinUsageService: CoinUsageService) {}

  @Post('use')
  @UseGuards(MemberGuard)
  async useCoins(
    @GetUser() user: { user_idx: number },
    @Body() useCoinDto: UseCoinDto,
  ) {
    return await this.coinUsageService.useCoins(user.user_idx, useCoinDto);
  }

  @Get('me/history')
  @UseGuards(MemberGuard)
  async getMyUsageHistory(
    @GetUser() user: { user_idx: number },
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return await this.coinUsageService.getMyUsageHistory(user.user_idx, limit);
  }

  @Get('me/stats')
  @UseGuards(MemberGuard)
  async getMyUsageStats(@GetUser() user: { user_idx: number }) {
    return await this.coinUsageService.getMyUsageStats(user.user_idx);
  }
}
