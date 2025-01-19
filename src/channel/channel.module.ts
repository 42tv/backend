import { Module } from '@nestjs/common';
import { ChannelService } from './channel.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  exports: [ChannelService],
  providers: [ChannelService],
})
export class ChannelModule {}
