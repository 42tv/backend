import { Module } from '@nestjs/common';
import { ChannelService } from './channel.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { IvsModule } from 'src/ivs/ivs.module';
import { StreamModule } from 'src/stream/stream.module';
import { ChannelRepository } from './channel.repository';

@Module({
  imports: [PrismaModule, IvsModule, StreamModule],
  providers: [ChannelService, ChannelRepository],
  exports: [ChannelService],
})
export class ChannelModule {}
