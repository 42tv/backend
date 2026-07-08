import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  /**
   * 신고 접수 (회원용)
   */
  @Post()
  @UseGuards(MemberGuard)
  async createReport(
    @Req() req,
    @Body() dto: CreateReportDto,
  ): Promise<SuccessResponseDto<any>> {
    const report = await this.reportService.createReport(req.user.idx, dto);
    return ResponseWrapper.success({ id: report.id }, '신고가 접수되었습니다.');
  }
}
