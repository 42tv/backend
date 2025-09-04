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
  @ApiOperation({
    summary: '채널 정보 조회',
    description:
      'user_id를 통해 사용자의 채널 정보, 게시글, 팬레벨을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '채널 정보 조회 성공',
    type: GetChannelResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '사용자를 찾을 수 없음',
    type: ChannelErrorResponseDto,
  })
  async getChannel(
    @Query() query: GetChannelQueryDto,
  ): Promise<GetChannelResponseDto> {
    return await this.channelService.getChannelInfo(query.user_id);
  }
}
