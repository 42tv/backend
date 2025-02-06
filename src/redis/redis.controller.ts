import { Controller, Get } from '@nestjs/common';
import { RedisService } from './redis.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { MessagePattern } from '@nestjs/microservices';

@Controller('redis')
export class RedisController {
  constructor(
    private readonly redisService: RedisService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @Get('test')
  async test() {
    await this.redis.publish('test', 'Hello Redis!');
    return 'Published!';
  }

  @MessagePattern('test')
  async testMessage(message: string) {
    console.log('message', message);
  }
}
