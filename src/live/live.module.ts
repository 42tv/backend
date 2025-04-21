import { Module } from '@nestjs/common';
import { LiveService } from './live.service';
import { StreamModule } from 'src/stream/stream.module';
import { LiveController } from './live.controller';

@Module({
  imports: [StreamModule],
  controllers: [LiveController],
  providers: [LiveService],
  exports: [LiveService],
})
export class LiveModule {}
