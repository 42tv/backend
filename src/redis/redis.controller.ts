import { Controller, Get } from '@nestjs/common';
import { RedisService } from './redis.service';

import { MessagePattern } from '@nestjs/microservices';

@Controller('redis')
export class RedisController {
  constructor(private readonly redisService: RedisService) {}

  @Get('test')
  async test() {
    return 'Published!';
  }

  @MessagePattern('test')
  async testMessage(message: string) {
    console.log('message', message);
  }
}
