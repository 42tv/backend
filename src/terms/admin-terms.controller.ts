import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminAuditLogService } from 'src/admin-audit-log/admin-audit-log.service';
import { CreateTermsDto } from './dto/create-terms.dto';

@Controller('admin/terms')
@UseGuards(AdminGuard)
export class AdminTermsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AdminAuditLogService,
  ) {}

  @Get()
  async getTerms(): Promise<SuccessResponseDto<any[]>> {
    const terms = await this.prisma.terms.findMany({
      orderBy: { version: 'desc' },
      include: { _count: { select: { UserTerms: true } } },
    });
    return ResponseWrapper.success(
      terms.map((term) => ({
        id: term.id,
        version: term.version,
        content: term.content,
        effectiveDate: term.effectiveDate,
        created_at: term.created_at,
        agreed_count: term._count.UserTerms,
      })),
      '약관 목록을 조회했습니다.',
    );
  }

  /**
   * 약관 신규 버전 등록 — 기존 버전은 수정하지 않고 새 버전을 추가한다
   */
  @Post()
  async createTerms(
    @Req() req,
    @Body() dto: CreateTermsDto,
  ): Promise<SuccessResponseDto<any>> {
    const existing = await this.prisma.terms.findFirst({
      where: { version: dto.version },
    });
    if (existing) {
      throw new BadRequestException('이미 존재하는 약관 버전입니다.');
    }

    const created = await this.prisma.terms.create({
      data: {
        version: dto.version,
        content: dto.content,
        effectiveDate: new Date(dto.effectiveDate),
      },
    });
    await this.auditLogService.record({
      adminIdx: req.user.idx,
      action: 'TERMS_CREATE',
      targetType: 'TERMS',
      targetId: created.id,
      detail: { version: dto.version },
    });
    return ResponseWrapper.success(created, '약관을 등록했습니다.');
  }
}
