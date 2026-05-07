import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';
import { SettlementAccountService } from './settlement-account.service';
import { UpsertSettlementAccountDto } from './dto/upsert-settlement-account.dto';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { SettlementAccountResponseDto } from './dto/settlement-account-response.dto';

@Controller('settlement-account')
@UseGuards(MemberGuard)
export class SettlementAccountController {
  constructor(
    private readonly settlementAccountService: SettlementAccountService,
  ) {}

  @Put()
  async upsert(
    @Request() req: any,
    @Body() dto: UpsertSettlementAccountDto,
  ): Promise<SuccessResponseDto<SettlementAccountResponseDto>> {
    const account = await this.settlementAccountService.upsert(
      req.user.idx,
      dto,
    );
    return ResponseWrapper.success(account, '정산 계좌가 등록되었습니다.');
  }

  @Get()
  async get(
    @Request() req: any,
  ): Promise<SuccessResponseDto<SettlementAccountResponseDto>> {
    const account = await this.settlementAccountService.getByUserIdx(
      req.user.idx,
    );
    return ResponseWrapper.success(account, '정산 계좌를 조회했습니다.');
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async delete(@Request() req: any): Promise<SuccessResponseDto<null>> {
    await this.settlementAccountService.delete(req.user.idx);
    return ResponseWrapper.success(null, '정산 계좌가 삭제되었습니다.');
  }
}
