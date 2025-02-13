import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RedisController } from './redis.controller';

// 실행할때마다 IP 맞게 바꾸어줘야함
const ip = '222.96.168.14';
@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      url: `redis://${ip}:6379`,
    }),
  ],
  providers: [RedisService],
  controllers: [RedisController],
  exports: [RedisService],
})
export class ChattingRedisModule {}
