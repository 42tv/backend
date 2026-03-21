import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OverlayGateway } from './overlay.gateway';
import { ChattingRedisModule } from 'src/redis/redis.module';

@Module({
  imports: [JwtModule.register({}), forwardRef(() => ChattingRedisModule)],
  providers: [OverlayGateway],
  exports: [OverlayGateway],
})
export class OverlayModule {}
