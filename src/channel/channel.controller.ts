import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChannelService } from './channel.service';
import { GetChannelQueryDto } from './dto/channel-request.dto';
import {
  GetChannelResponseDto,
  ChannelErrorResponseDto,
} from './dto/channel-response.dto';

@ApiTags('Channel')
@Controller('channel')
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Get()
  async getChannel(
    @Query() query: GetChannelQueryDto,
  ): Promise<GetChannelResponseDto> {
    return await this.channelService.getChannelInfo(query.user_id);
  }
}
