import { Controller, Get } from '@nestjs/common';
import { LiveService } from './live.service';

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
}
