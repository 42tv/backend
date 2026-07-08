import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { RedisService } from 'src/redis/redis.service';
import { RedisMessages } from 'src/redis/interfaces/message-namespace';
import { AdminAuditLogService } from 'src/admin-audit-log/admin-audit-log.service';
import { GlobalNoticeDto } from './dto/global-notice.dto';

@Controller('admin/chat')
@UseGuards(AdminGuard)
export class AdminChatController {
  constructor(
    private readonly redisService: RedisService,
    private readonly auditLogService: AdminAuditLogService,
  ) {}

  /**
   * 전체 공지 — 모든 서버의 모든 라이브 채팅방에 시스템 메시지 전파
   * (Redis admin_command 채널 경유, 프론트는 'notice' 이벤트 수신)
   */
  @Post('broadcast')
  async broadcastNotice(
    @Req() req,
    @Body() dto: GlobalNoticeDto,
  ): Promise<SuccessResponseDto<null>> {
    await this.redisService.publishAdminCommand(
      RedisMessages.globalNotice(dto.message),
    );
    await this.auditLogService.record({
      adminIdx: req.user.idx,
      action: 'CHAT_GLOBAL_NOTICE',
      targetType: 'CHAT',
      targetId: 'all',
      detail: { message: dto.message },
    });
    return ResponseWrapper.success(null, '전체 공지를 전송했습니다.');
  }
}
