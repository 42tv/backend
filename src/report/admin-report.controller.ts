import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ReportStatus, ReportTargetType } from '@prisma/client';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { ReportService } from './report.service';
import { ResolveReportDto } from './dto/resolve-report.dto';

@Controller('admin/reports')
@UseGuards(AdminGuard)
export class AdminReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get()
  async getReports(
    @Query('status') status?: string,
    @Query('targetType') targetType?: string,
    @Query('reportedIdx') reportedIdx?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<SuccessResponseDto<{ reports: any[] }>> {
    const take = limit ? parseInt(limit, 10) : 20;
    const currentPage = page ? parseInt(page, 10) : 1;

    const { items, total } = await this.reportService.findAll({
      status:
        status && Object.values(ReportStatus).includes(status as ReportStatus)
          ? (status as ReportStatus)
          : undefined,
      targetType:
        targetType &&
        Object.values(ReportTargetType).includes(targetType as ReportTargetType)
          ? (targetType as ReportTargetType)
          : undefined,
      reportedIdx: reportedIdx ? parseInt(reportedIdx, 10) : undefined,
      limit: take,
      offset: (currentPage - 1) * take,
    });

    return ResponseWrapper.success(
      { reports: items },
      '신고 목록을 조회했습니다.',
      {
        page: currentPage,
        limit: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    );
  }

  @Get(':id')
  async getReportDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessResponseDto<any>> {
    const report = await this.reportService.findDetail(id);
    return ResponseWrapper.success(report, '신고 상세를 조회했습니다.');
  }

  @Post(':id/resolve')
  async resolveReport(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveReportDto,
  ): Promise<SuccessResponseDto<any>> {
    const resolved = await this.reportService.resolveReport(
      id,
      req.user.idx,
      dto,
    );
    return ResponseWrapper.success(resolved, '신고를 처리했습니다.');
  }
}
