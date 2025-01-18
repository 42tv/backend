import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { IvsService } from './ivs.service';

// 이 컨트롤러는 테스트 용임으로 차후 삭제할 예정
@Controller('ivs')
export class IvsController {
  constructor(private readonly ivsService: IvsService) {}

  @Get('create-channel/:channelName')
  async createChannel(@Param('channelName') channelName: string) {
    return this.ivsService.createChannel(channelName);
  }

  @Post('create-stream-key')
  async createStreamKey(@Body('channelArn') channelArn: string) {
    return this.ivsService.createStreamKey(channelArn);
  }

  @Post('get-stream-key')
  async getStreamKey(@Body('streamKeyArn') streamKeyArn: string) {
    return this.ivsService.getStreamKey(streamKeyArn);
  }
}
