import { Module } from '@nestjs/common';
import { StreamService } from './stream.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [StreamService],
  exports: [StreamService],
})
export class StreamModule {}
