import { Module } from '@nestjs/common';
import { StreamViewerService } from './stream-viewer.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [StreamViewerService],
  exports: [StreamViewerService], // Added comma here
})
export class StreamViewerModule {}
