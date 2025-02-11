import {
  Controller,
  Request,
  Post,
  Body,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { IvsService } from './ivs.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';

// 이 컨트롤러는 테스트 용임으로 차후 삭제할 예정
@Controller('ivs')
export class IvsController {
  constructor(private readonly ivsService: IvsService) {}

  @Post('stream-key')
  @UseGuards(JwtAuthGuard)
  async createChannel(
    @Request() req,
    @Param('channelName') channelName: string,
  ) {
    // return this.ivsService.createChannel(channelName);
    return channelName;
  }

  @Put('stream-key')
  @UseGuards(JwtAuthGuard)
  async getStreamKey(@Body('streamKeyArn') streamKeyArn: string) {
    return this.ivsService.getStreamKey(streamKeyArn);
  }
}
