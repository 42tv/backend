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
import { SanctionStatus, SanctionType } from '@prisma/client';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { SanctionService } from './sanction.service';
import { CreateSanctionDto } from './dto/create-sanction.dto';
import { ReleaseSanctionDto } from './dto/release-sanction.dto';

@Controller('admin/sanctions')
@UseGuards(AdminGuard)
export class AdminSanctionController {
  constructor(private readonly sanctionService: SanctionService) {}

  @Get()
  async getSanctions(
    @Query('userIdx') userIdx?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<SuccessResponseDto<{ sanctions: any[] }>> {
    const take = limit ? parseInt(limit, 10) : 20;
    const currentPage = page ? parseInt(page, 10) : 1;

    const { items, total } = await this.sanctionService.findAll({
      userIdx: userIdx ? parseInt(userIdx, 10) : undefined,
      type:
        type && Object.values(SanctionType).includes(type as SanctionType)
          ? (type as SanctionType)
          : undefined,
      status:
        status &&
        Object.values(SanctionStatus).includes(status as SanctionStatus)
          ? (status as SanctionStatus)
          : undefined,
      limit: take,
      offset: (currentPage - 1) * take,
    });

    return ResponseWrapper.success(
      { sanctions: items },
      '제재 이력을 조회했습니다.',
      {
        page: currentPage,
        limit: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    );
  }

  @Post()
  async createSanction(
    @Req() req,
    @Body() dto: CreateSanctionDto,
  ): Promise<SuccessResponseDto<any>> {
    const sanction = await this.sanctionService.createSanction(
      req.user.idx,
      dto,
    );
    return ResponseWrapper.success(sanction, '제재를 등록했습니다.');
  }

  @Post(':id/release')
  async releaseSanction(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @Body() dto: ReleaseSanctionDto,
  ): Promise<SuccessResponseDto<any>> {
    const sanction = await this.sanctionService.releaseSanction(
      id,
      req.user.idx,
      dto.reason,
    );
    return ResponseWrapper.success(sanction, '제재를 해제했습니다.');
  }
}
