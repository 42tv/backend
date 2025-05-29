import { Module } from '@nestjs/common';
import { LiveService } from './live.service';
import { StreamModule } from 'src/stream/stream.module';
import { LiveController } from './live.controller';
import { ChattingRedisModule } from 'src/redis/redis.module';

@Module({
  imports: [StreamModule, ChattingRedisModule],
  controllers: [LiveController],
  providers: [LiveService],
  exports: [LiveService],
})
export class LiveModule {}
