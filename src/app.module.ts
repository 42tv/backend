import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { IvsService } from './ivs/ivs.service';
import { IvsModule } from './ivs/ivs.module';
import { GraylogProviderModule } from './graylog-provider/graylog-provider.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { ChannelModule } from './channel/channel.module';
import { UserDetailModule } from './user-detail/user-detail.module';
import { LogModule } from './log/log.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    IvsModule,
    GraylogProviderModule,
    UserModule,
    PrismaModule,
    ChannelModule,
    UserDetailModule,
    LogModule,
  ],
  controllers: [AppController],
  providers: [AppService, IvsService],
})
export class AppModule {}
