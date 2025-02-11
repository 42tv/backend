import { Controller, Request, Post, Put, UseGuards } from '@nestjs/common';
import { IvsService } from './ivs.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { User } from 'src/user/entities/user.entity';

// 이 컨트롤러는 테스트 용임으로 차후 삭제할 예정
@Controller('ivs')
export class IvsController {
  constructor(private readonly ivsService: IvsService) {}

  @Post('stream-key')
  @UseGuards(JwtAuthGuard)
  async createChannel(@Request() req) {
    const user: User = req.user;
    return await this.ivsService.updateIvsChannel(
      user.idx,
      user.userId.replace('@', '_'),
    );
  }

  @Put('stream-key')
  @UseGuards(JwtAuthGuard)
  async getStreamKey(@Request() req) {
    const user: User = req.user;
    return this.ivsService.recreateStreamKey(user);
  }
}
