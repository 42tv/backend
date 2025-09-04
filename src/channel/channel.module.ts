import { Module, forwardRef } from '@nestjs/common';
import { ChannelService } from './channel.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StreamModule } from 'src/stream/stream.module';
import { ChannelRepository } from './channel.repository';
import { ChannelController } from './channel.controller';
import { UserModule } from 'src/user/user.module';
import { ArticleModule } from 'src/article/article.module';
import { FanLevelModule } from 'src/fan-level/fan-level.module';

@Module({
  imports: [
    PrismaModule,
    StreamModule,
    forwardRef(() => UserModule),
    forwardRef(() => ArticleModule),
    FanLevelModule,
  ],
  providers: [ChannelService, ChannelRepository],
  exports: [ChannelService],
  controllers: [ChannelController],
})
export class ChannelModule {}
