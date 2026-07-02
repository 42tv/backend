import {
  Body,
  Controller,
  Logger,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import {
  NcpBroadcastCredentials,
  NcpChannelLifecycleService,
} from './services/ncp-channel-lifecycle.service';
import { NcpStreamEventService } from './services/ncp-stream-event.service';
import { NcpWebhookGuard } from './guards/ncp-webhook.guard';
import { NcpCallbackDto } from './dto/ncp-callback.dto';

@Controller('ncp')
export class NcpLiveStationController {
  private readonly logger = new Logger(NcpLiveStationController.name);

  constructor(
    private readonly lifecycle: NcpChannelLifecycleService,
    private readonly streamEvent: NcpStreamEventService,
  ) {}

  /**
   * 방송 준비 — 채널이 살아있음을 보장하고 송출 자격증명을 발급한다.
   * (없거나 30일 회수됐으면 내부에서 재생성)
   */
  @Post('stream-key')
  @UseGuards(MemberGuard)
  async ensureChannel(
    @Request() req,
  ): Promise<SuccessResponseDto<NcpBroadcastCredentials>> {
    const creds = await this.lifecycle.ensureChannel(req.user.idx);
    return ResponseWrapper.success(creds, '방송 채널을 준비했습니다.');
  }

  /**
   * 스트림키 재발급 — 기존 채널을 반납하고 새 채널을 생성한다(새 키).
   * 방송 중에는 거부된다.
   */
  @Put('stream-key')
  @UseGuards(MemberGuard)
  async reissueChannel(
    @Request() req,
  ): Promise<SuccessResponseDto<NcpBroadcastCredentials>> {
    const creds = await this.lifecycle.reissueChannel(req.user.idx);
    return ResponseWrapper.success(creds, '스트림키를 재발급했습니다.');
  }

  /**
   * Global Callback URL 등록 (1회성, 전 채널 공통).
   * NcpWebhookGuard(쿼리 시크릿)로 보호 — POST /ncp/callback/register?secret=...
   */
  @Post('callback/register')
  @UseGuards(NcpWebhookGuard)
  async registerCallback(): Promise<
    SuccessResponseDto<{ callbackUrl: string }>
  > {
    const callbackUrl = await this.streamEvent.registerGlobalCallback();
    return ResponseWrapper.success({ callbackUrl }, '콜백 URL을 등록했습니다.');
  }

  /**
   * NCP 방송 시작/종료 콜백 수신 — POST /ncp/callback?secret=...
   * (IVS 의 POST /ivs/callback/lambda 대체)
   */
  @Post('callback')
  @UseGuards(NcpWebhookGuard)
  async handleCallback(
    @Body() dto: NcpCallbackDto,
  ): Promise<SuccessResponseDto<null>> {
    this.logger.log(`NCP 콜백 수신: ${dto.event} / ${dto.channelId}`);
    await this.streamEvent.handleCallbackEvent(dto);
    return ResponseWrapper.success(null, 'success');
  }
}
