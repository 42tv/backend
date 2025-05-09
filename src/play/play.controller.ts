import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { PlayService } from './play.service';
import { GuestGuard } from 'src/auth/guard/jwt.guest.guard';

@Controller('play')
export class PlayController {
  constructor(private readonly playService: PlayService) {}

  @Post('')
  @UseGuards(GuestGuard)
  async play(@Req() req, @Body() body) {
    const isGuest = req.user.is_guest;
    const userIdx = req.user.idx;
    const guestId = req.user.guest_id;
    const { stream_id, password } = body;
    return await this.playService.play(
      userIdx,
      stream_id,
      isGuest,
      guestId,
      password,
    );
  }
}
