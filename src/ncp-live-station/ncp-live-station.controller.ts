import { Controller, Post, Put, Request, UseGuards } from '@nestjs/common';
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import {
  NcpBroadcastCredentials,
  NcpChannelLifecycleService,
} from './services/ncp-channel-lifecycle.service';

@Controller('ncp')
export class NcpLiveStationController {
  constructor(private readonly lifecycle: NcpChannelLifecycleService) {}

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
}
