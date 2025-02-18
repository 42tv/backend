import { Module } from '@nestjs/common';
import { ChannelService } from './channel.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StreamModule } from 'src/stream/stream.module';
import { ChannelRepository } from './channel.repository';

@Module({
  imports: [PrismaModule, StreamModule],
  providers: [ChannelService, ChannelRepository],
  exports: [ChannelService],
})
export class ChannelModule {}
