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
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';

@Controller('coin-usage')
export class CoinUsageController {
  constructor(private readonly coinUsageService: CoinUsageService) {}

  @Post('use')
  @UseGuards(MemberGuard)
  async useCoins(
    @GetUser() user: { user_idx: number },
    @Body() useCoinDto: UseCoinDto,
  ): Promise<SuccessResponseDto<any>> {
    const result = await this.coinUsageService.useCoins(
      user.user_idx,
      useCoinDto,
    );
    return ResponseWrapper.success(result, '코인을 사용했습니다.');
  }

  @Get('me/history')
  @UseGuards(MemberGuard)
  async getMyUsageHistory(
    @GetUser() user: { user_idx: number },
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<SuccessResponseDto<any>> {
    const history = await this.coinUsageService.getMyUsageHistory(
      user.user_idx,
      limit,
    );
    return ResponseWrapper.success(history, '코인 사용 내역을 조회했습니다.');
  }

  @Get('me/stats')
  @UseGuards(MemberGuard)
  async getMyUsageStats(
    @GetUser() user: { user_idx: number },
  ): Promise<SuccessResponseDto<any>> {
    const stats = await this.coinUsageService.getMyUsageStats(user.user_idx);
    return ResponseWrapper.success(stats, '코인 사용 통계를 조회했습니다.');
  }
}
