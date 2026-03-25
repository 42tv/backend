import { forwardRef, Module } from '@nestjs/common';
import { OverlayGateway } from './overlay.gateway';
import { RealtimeRedisModule } from 'src/redis/redis.module';
import { WidgetModule } from 'src/widget/widget.module';

@Module({
  imports: [
    forwardRef(() => RealtimeRedisModule),
    forwardRef(() => WidgetModule),
  ],
  providers: [OverlayGateway],
  exports: [OverlayGateway],
})
export class OverlayModule {}
