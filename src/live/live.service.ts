import { Injectable } from '@nestjs/common';
import { StreamService } from 'src/stream/stream.service';

@Injectable()
export class LiveService {
  constructor(private readonly streamService: StreamService) {}

  async getLiveList() {
    return await this.streamService.getLiveList();
  }
}
