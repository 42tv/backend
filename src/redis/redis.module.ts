import { forwardRef, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ChatModule } from 'src/chat/chat.module';
import { OverlayModule } from 'src/overlay/overlay.module';

// 실행할때마다 IP 맞게 바꾸어줘야함
const ip = process.env.REDIS_IP;
const password = process.env.REDIS_PASSWORD;
@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      url: `redis://:${encodeURIComponent(password)}@${ip}:6379`,
    }),
    forwardRef(() => ChatModule),
    forwardRef(() => OverlayModule),
  ],
  providers: [RedisService],
  controllers: [],
  exports: [RedisService],
})
export class RealtimeRedisModule {}
