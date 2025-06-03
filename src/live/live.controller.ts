import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { LiveService } from './live.service';
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';

@Controller('live')
export class LiveController {
  constructor(private readonly liveService: LiveService) {}

  @Get()
  async getLiveList() {
    const liveList = await this.liveService.getLiveList();
    return {
      code: 200,
      message: 'success',
      lives: liveList,
    };
  }

  @Post('like')
  @UseGuards(MemberGuard)
  async likeLiveStream(@Req() req, @Body('broadcaster_idx') broadcaster_idx: number) {
    await this.liveService.likeLiveStream(broadcaster_idx);
    return {
      code: 200,
      message: 'Live stream liked successfully',
    };
  }
}
