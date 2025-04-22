import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { IvsModule } from './ivs/ivs.module';
import { GraylogProviderModule } from './graylog-provider/graylog-provider.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { ChannelModule } from './channel/channel.module';
import { UserDetailModule } from './user-detail/user-detail.module';
import { LogModule } from './log/log.module';
import { AuthModule } from './auth/auth.module';
import { OauthModule } from './oauth/oauth.module';
import { StreamModule } from './stream/stream.module';
import { ChattingRedisModule } from './redis/redis.module';
import { ChatModule } from './chat/chat.module';
import { JwtCookieMiddleware } from './middle-ware/jwt-cookie.middleware';
import { PostModule } from './post/post.module';
import { FanLevelModule } from './fan-level/fan-level.module';
import { BroadcastSettingModule } from './broadcast-setting/broadcast-setting.module';
import { AwsModule } from './aws/aws.module';
import { LiveController } from './live/live.controller';
import { LiveModule } from './live/live.module';
import { PlayModule } from './play/play.module';

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
    AuthModule,
    OauthModule,
    StreamModule,
    ChattingRedisModule,
    ChatModule,
    PostModule,
    FanLevelModule,
    BroadcastSettingModule,
    AwsModule,
    LiveModule,
    PlayModule,
  ],
  controllers: [AppController, LiveController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtCookieMiddleware).forRoutes('*');
  }
}
