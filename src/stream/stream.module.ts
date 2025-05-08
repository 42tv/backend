import { Module } from '@nestjs/common';
import { StreamService } from './stream.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StreamRepository } from './stream.repository';
import { StreamViewerModule } from 'src/stream-viewer/stream-viewer.module';

@Module({
  imports: [PrismaModule, StreamViewerModule],
  providers: [StreamService, StreamRepository],
  exports: [StreamService],
})
export class StreamModule {}
