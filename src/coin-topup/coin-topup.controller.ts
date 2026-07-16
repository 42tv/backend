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
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { MemberGuard } from '../auth/guard/jwt.member.guard';
import { GetUser } from '../auth/get-user.decorator';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';

@Controller('coin-topups')
export class CoinTopupController {
  constructor(private readonly coinTopupService: CoinTopupService) {}

  @Post('process')
  @UseGuards(MemberGuard)
  async processTopup(
    @GetUser() user: { idx: number },
    @Body() processDto: ProcessTopupDto,
  ): Promise<SuccessResponseDto<any>> {
    const topup = await this.coinTopupService.processTopup(
      user.idx,
      processDto,
    );
    return ResponseWrapper.success(topup, '코인 충전을 처리했습니다.');
  }

  @Get('me')
  @UseGuards(MemberGuard)
  async getMyTopups(
    @GetUser() user: { idx: number },
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<SuccessResponseDto<{ topups: any[] }>> {
    const topups = await this.coinTopupService.findByUserId(user.idx, limit);
    return ResponseWrapper.success({ topups }, '충전 내역을 조회했습니다.');
  }

  @Get('me/available')
  @UseGuards(MemberGuard)
  async getAvailableTopups(
    @GetUser() user: { idx: number },
  ): Promise<SuccessResponseDto<any>> {
    const topups = await this.coinTopupService.getAvailableTopups(user.idx);
    return ResponseWrapper.success(
      topups,
      '사용 가능한 충전 내역을 조회했습니다.',
    );
  }

  @Get('me/stats')
  @UseGuards(MemberGuard)
  async getMyTopupStats(
    @GetUser() user: { idx: number },
  ): Promise<SuccessResponseDto<any>> {
    const stats = await this.coinTopupService.getTopupStats(user.idx);
    return ResponseWrapper.success(stats, '충전 통계를 조회했습니다.');
  }

  // 정적 세그먼트 라우트는 me/:topup_id/* 와일드카드보다 위에 선언해야 함
  @Get('me/refund-requests')
  @UseGuards(MemberGuard)
  async getMyRefundRequests(
    @GetUser() user: { idx: number },
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<SuccessResponseDto<{ requests: any[] }>> {
    const requests = await this.coinTopupService.getMyRefundRequests(
      user.idx,
      limit,
    );
    return ResponseWrapper.success(
      { requests },
      '환불 요청 목록을 조회했습니다.',
    );
  }

  @Post('me/refund-requests/:request_id/cancel')
  @UseGuards(MemberGuard)
  async cancelRefundRequest(
    @GetUser() user: { idx: number },
    @Param('request_id') request_id: string,
  ): Promise<SuccessResponseDto<any>> {
    const result = await this.coinTopupService.cancelRefundRequest(
      request_id,
      user.idx,
    );
    return ResponseWrapper.success(result, '환불 요청을 취소했습니다.');
  }

  /**
   * 사용자 청약철회 요청 접수 (전자상거래법 §17)
   * 결제일로부터 7일 이내, 잔여 코인에 한해 접수 후 관리자 승인으로 환불된다.
   */
  @Post('me/:topup_id/refund-request')
  @UseGuards(MemberGuard)
  async createRefundRequest(
    @GetUser() user: { idx: number },
    @Param('topup_id') topup_id: string,
    @Body() dto: CreateRefundRequestDto,
  ): Promise<SuccessResponseDto<any>> {
    const request = await this.coinTopupService.createRefundRequest(
      topup_id,
      user.idx,
      dto.user_reason,
    );
    return ResponseWrapper.success(
      request,
      '환불 요청이 접수되었습니다. 승인 후 환불이 진행됩니다.',
    );
  }

  @Get(':id')
  @UseGuards(MemberGuard)
  async findById(@Param('id') id: string): Promise<SuccessResponseDto<any>> {
    const topup = await this.coinTopupService.findById(id);
    return ResponseWrapper.success(topup, '충전 상세를 조회했습니다.');
  }
}
