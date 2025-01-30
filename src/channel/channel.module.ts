import { Module } from '@nestjs/common';
import { ChannelService } from './channel.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { IvsModule } from 'src/ivs/ivs.module';
import { StreamModule } from 'src/stream/stream.module';

@Module({
  imports: [PrismaModule, IvsModule, StreamModule],
  exports: [ChannelService],
  providers: [ChannelService],
})
export class ChannelModule {}
