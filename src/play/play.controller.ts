import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PlayService } from './play.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';

@Controller('play')
export class PlayController {
  constructor(private readonly playService: PlayService) {}

  @Get(':user_id')
  @UseGuards(JwtAuthGuard)
  async play(@Param('user_id') userId: string) {
    return this.playService.play(userId);
  }
}
