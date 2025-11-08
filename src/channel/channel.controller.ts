import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChannelService } from './channel.service';
import { GetChannelQueryDto } from './dto/channel-request.dto';
import { GetChannelResponseDto } from './dto/channel-response.dto';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';

@ApiTags('Channel')
@Controller('channel')
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Get()
  async getChannel(
    @Query() query: GetChannelQueryDto,
  ): Promise<SuccessResponseDto<GetChannelResponseDto>> {
    const channel = await this.channelService.getChannelInfo(query.user_id);
    return ResponseWrapper.success(channel, '채널 정보를 조회했습니다.');
  }
}
