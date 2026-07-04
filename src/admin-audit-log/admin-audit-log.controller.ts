import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { AdminAuditLogService } from './admin-audit-log.service';

@Controller('admin/audit-logs')
@UseGuards(AdminGuard)
export class AdminAuditLogController {
  constructor(private readonly auditLogService: AdminAuditLogService) {}

  @Get()
  async getAuditLogs(
    @Query('adminIdx') adminIdx?: string,
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<SuccessResponseDto<{ logs: any[] }>> {
    const take = limit ? parseInt(limit, 10) : 20;
    const currentPage = page ? parseInt(page, 10) : 1;

    const { items, total } = await this.auditLogService.findAll({
      adminIdx: adminIdx ? parseInt(adminIdx, 10) : undefined,
      action,
      targetType,
      targetId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: take,
      offset: (currentPage - 1) * take,
    });

    return ResponseWrapper.success(
      { logs: items },
      '감사 로그를 조회했습니다.',
      {
        page: currentPage,
        limit: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    );
  }
}
