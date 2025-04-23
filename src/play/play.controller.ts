import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { PlayService } from './play.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';

@Controller('play')
export class PlayController {
  constructor(private readonly playService: PlayService) {}

  @Post('')
  @UseGuards(JwtAuthGuard)
  async play(@Req() req, @Body() body) {
    const userIdx = req.user.idx;
    const { streamerId, password } = body;
    return this.playService.play(userIdx, streamerId, password);
  }
}
