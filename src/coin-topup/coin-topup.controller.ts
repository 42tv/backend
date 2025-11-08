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
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';

@Controller('coin-topups')
export class CoinTopupController {
  constructor(private readonly coinTopupService: CoinTopupService) {}

  @Post('process')
  @UseGuards(MemberGuard)
  async processTopup(
    @GetUser() user: { user_idx: number },
    @Body() processDto: ProcessTopupDto,
  ): Promise<SuccessResponseDto<any>> {
    const topup = await this.coinTopupService.processTopup(
      user.user_idx,
      processDto,
    );
    return ResponseWrapper.success(topup, '코인 충전을 처리했습니다.');
  }

  @Post(':transaction_id/fail')
  @UseGuards(AdminGuard)
  async failTopup(
    @Param('transaction_id') transaction_id: string,
  ): Promise<SuccessResponseDto<any>> {
    const result = await this.coinTopupService.failTopup(transaction_id);
    return ResponseWrapper.success(
      result,
      '충전 트랜잭션을 실패 처리했습니다.',
    );
  }

  @Post(':topup_id/refund')
  @UseGuards(AdminGuard)
  async processRefund(
    @Param('topup_id') topup_id: string,
  ): Promise<SuccessResponseDto<any>> {
    const refund = await this.coinTopupService.processRefund(topup_id);
    return ResponseWrapper.success(refund, '코인 환불을 처리했습니다.');
  }

  @Get('me')
  @UseGuards(MemberGuard)
  async getMyTopups(
    @GetUser() user: { user_idx: number },
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<SuccessResponseDto<{ topups: any[] }>> {
    const topups = await this.coinTopupService.findByUserId(
      user.user_idx,
      limit,
    );
    return ResponseWrapper.success({ topups }, '충전 내역을 조회했습니다.');
  }

  @Get('me/available')
  @UseGuards(MemberGuard)
  async getAvailableTopups(
    @GetUser() user: { user_idx: number },
  ): Promise<SuccessResponseDto<any>> {
    const topups = await this.coinTopupService.getAvailableTopups(
      user.user_idx,
    );
    return ResponseWrapper.success(
      topups,
      '사용 가능한 충전 내역을 조회했습니다.',
    );
  }

  @Get('me/stats')
  @UseGuards(MemberGuard)
  async getMyTopupStats(
    @GetUser() user: { user_idx: number },
  ): Promise<SuccessResponseDto<any>> {
    const stats = await this.coinTopupService.getTopupStats(user.user_idx);
    return ResponseWrapper.success(stats, '충전 통계를 조회했습니다.');
  }

  @Get(':id')
  @UseGuards(MemberGuard)
  async findById(@Param('id') id: string): Promise<SuccessResponseDto<any>> {
    const topup = await this.coinTopupService.findById(id);
    return ResponseWrapper.success(topup, '충전 상세를 조회했습니다.');
  }
}
