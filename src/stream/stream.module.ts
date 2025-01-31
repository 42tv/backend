import { Module } from '@nestjs/common';
import { StreamService } from './stream.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [StreamService],
  exports: [StreamService],
})
export class StreamModule {}
