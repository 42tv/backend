import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { AdminLiveService } from './admin-live.service';
import { KickViewerDto } from './dto/kick-viewer.dto';
import {
  AdminForceEndDto,
  AdminRoomNoticeDto,
  AdminUpdateCategoryDto,
} from './dto/admin-live.dto';

@Controller('admin/live')
@UseGuards(AdminGuard)
export class AdminLiveController {
  constructor(private readonly adminLiveService: AdminLiveService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async getAdminLiveList(): Promise<SuccessResponseDto<any[]>> {
    const lives = await this.adminLiveService.getAdminLiveList();
    return ResponseWrapper.success(
      lives,
      '관리자용 라이브 목록을 조회했습니다.',
    );
  }

  @Post(':broadcasterIdx/end')
  async forceEndBroadcast(
    @Req() req,
    @Param('broadcasterIdx', ParseIntPipe) broadcasterIdx: number,
    @Body() dto: AdminForceEndDto,
  ): Promise<SuccessResponseDto<null>> {
    await this.adminLiveService.forceEndBroadcast(
      req.user.idx,
      broadcasterIdx,
      dto?.reason,
    );
    return ResponseWrapper.success(null, '방송을 강제 종료했습니다.');
  }

  @Get(':broadcasterIdx/viewers')
  @Header('Cache-Control', 'no-store')
  async getViewers(
    @Param('broadcasterIdx', ParseIntPipe) broadcasterIdx: number,
  ): Promise<SuccessResponseDto<any[]>> {
    const viewers = await this.adminLiveService.getViewers(broadcasterIdx);
    return ResponseWrapper.success(viewers, '시청자 목록을 조회했습니다.');
  }

  @Post(':broadcasterIdx/kick')
  async kickViewer(
    @Req() req,
    @Param('broadcasterIdx', ParseIntPipe) broadcasterIdx: number,
    @Body() kickViewerDto: KickViewerDto,
  ): Promise<SuccessResponseDto<null>> {
    const message = await this.adminLiveService.kickViewer(
      req.user.idx,
      broadcasterIdx,
      kickViewerDto,
    );
    return ResponseWrapper.success(null, message);
  }

  @Post(':broadcasterIdx/notice')
  async sendRoomNotice(
    @Req() req,
    @Param('broadcasterIdx', ParseIntPipe) broadcasterIdx: number,
    @Body() dto: AdminRoomNoticeDto,
  ): Promise<SuccessResponseDto<null>> {
    await this.adminLiveService.sendRoomNotice(
      req.user.idx,
      broadcasterIdx,
      dto.message,
    );
    return ResponseWrapper.success(null, '관리자 공지를 전송했습니다.');
  }

  @Post(':broadcasterIdx/curtain/start')
  async startCurtain(
    @Req() req,
    @Param('broadcasterIdx', ParseIntPipe) broadcasterIdx: number,
    @Body() dto: AdminForceEndDto,
  ): Promise<SuccessResponseDto<null>> {
    await this.adminLiveService.startCurtain(
      req.user.idx,
      broadcasterIdx,
      dto?.reason,
    );
    return ResponseWrapper.success(null, '방송을 블라인드 처리했습니다.');
  }

  @Post(':broadcasterIdx/curtain/stop')
  async stopCurtain(
    @Req() req,
    @Param('broadcasterIdx', ParseIntPipe) broadcasterIdx: number,
  ): Promise<SuccessResponseDto<null>> {
    await this.adminLiveService.stopCurtain(req.user.idx, broadcasterIdx);
    return ResponseWrapper.success(null, '블라인드를 해제했습니다.');
  }

  @Patch(':broadcasterIdx/category')
  async forceUpdateCategory(
    @Req() req,
    @Param('broadcasterIdx', ParseIntPipe) broadcasterIdx: number,
    @Body() dto: AdminUpdateCategoryDto,
  ): Promise<SuccessResponseDto<null>> {
    await this.adminLiveService.forceUpdateCategory(
      req.user.idx,
      broadcasterIdx,
      dto.category,
      dto.reason,
    );
    return ResponseWrapper.success(null, '카테고리를 변경했습니다.');
  }
}
