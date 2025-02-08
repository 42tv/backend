import { Module } from '@nestjs/common';
import { StreamService } from './stream.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StreamRepository } from './stream.repository';

@Module({
  imports: [PrismaModule],
  providers: [StreamService, StreamRepository],
  exports: [StreamService],
})
export class StreamModule {}
