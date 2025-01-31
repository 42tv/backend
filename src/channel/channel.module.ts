import { Module } from '@nestjs/common';
import { ChannelService } from './channel.service';
import { PrismaModule } from '../prisma/prisma.module';
import { IvsModule } from '../ivs/ivs.module';
import { StreamModule } from '../stream/stream.module';

@Module({
  imports: [PrismaModule, IvsModule, StreamModule],
  providers: [ChannelService],
  exports: [ChannelService],
})
export class ChannelModule {}
