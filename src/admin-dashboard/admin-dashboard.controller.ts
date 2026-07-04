import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { AdminDashboardService } from './admin-dashboard.service';

@Controller('admin/dashboard')
@UseGuards(AdminGuard)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('summary')
  @Header('Cache-Control', 'no-store')
  async getSummary(): Promise<SuccessResponseDto<any>> {
    const summary = await this.dashboardService.getSummary();
    return ResponseWrapper.success(summary, '대시보드 집계를 조회했습니다.');
  }
}
