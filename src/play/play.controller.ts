import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { PlayService } from './play.service';
import { GuestGuard } from 'src/auth/guard/jwt.guest.guard';

@Controller('play')
export class PlayController {
  constructor(private readonly playService: PlayService) {}

  @Post('')
  @UseGuards(GuestGuard)
  async play(@Req() req, @Body() body) {
    console.log(req.user);
    const userIdx = req.user.idx;
    const { streamerId, password } = body;
    // return this.playService.play(userIdx, streamerId, password);
    return;
  }
}
