import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { PlayService } from './play.service';
import { GuestGaurd } from 'src/auth/guard/jwt.guest.guard';

@Controller('play')
export class PlayController {
  constructor(private readonly playService: PlayService) {}

  @Post('')
  @UseGuards(GuestGaurd)
  async play(@Req() req, @Body() body) {
    const userIdx = req.user.idx;
    const { streamerId, password } = body;
    return this.playService.play(userIdx, streamerId, password);
  }
}
