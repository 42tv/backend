import { Module } from '@nestjs/common';
import { LiveService } from './live.service';
import { StreamModule } from 'src/stream/stream.module';
import { LiveController } from './live.controller';
import { ChattingRedisModule } from 'src/redis/redis.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [StreamModule, ChattingRedisModule, UserModule],
  controllers: [LiveController],
  providers: [LiveService],
  exports: [LiveService],
})
export class LiveModule {}
