import { Module, forwardRef } from '@nestjs/common';
import { ChannelService } from './channel.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ChannelRepository } from './channel.repository';
import { ChannelController } from './channel.controller';
import { UserModule } from 'src/user/user.module';
import { ArticleModule } from 'src/article/article.module';
import { FanLevelModule } from 'src/fan-level/fan-level.module';
import { FanModule } from 'src/fan/fan.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => UserModule),
    forwardRef(() => ArticleModule),
    FanLevelModule,
    FanModule,
  ],
  providers: [ChannelService, ChannelRepository],
  exports: [ChannelService],
  controllers: [ChannelController],
})
export class ChannelModule {}
