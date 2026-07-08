import { forwardRef, Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AccountDeletionService } from './account-deletion.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { LogModule } from 'src/log/log.module';
import { ChannelModule } from 'src/channel/channel.module';
import { UserRepository } from './user.repository';
import { FanLevelModule } from 'src/fan-level/fan-level.module';
import { BroadcastSettingModule } from 'src/broadcast-setting/broadcast-setting.module';
import { AwsModule } from 'src/aws/aws.module';
import { BookmarkModule } from 'src/bookmark/bookmark.module';
import { BlacklistModule } from 'src/blacklist/blacklist.module';
import { RealtimeRedisModule } from 'src/redis/redis.module';
import { CoinBalanceModule } from 'src/coin-balance/coin-balance.module';
import { NcpLiveStationModule } from 'src/ncp-live-station/ncp-live-station.module';
import { AdminAuditLogModule } from 'src/admin-audit-log/admin-audit-log.module';
import { AdminUserController } from './admin-user.controller';
import { AdminUserService } from './admin-user.service';
import { AdminUserRepository } from './admin-user.repository';

@Module({
  imports: [
    PrismaModule,
    LogModule,
    ChannelModule,
    FanLevelModule,
    BroadcastSettingModule,
    AwsModule,
    BookmarkModule,
    BlacklistModule,
    CoinBalanceModule,
    NcpLiveStationModule,
    forwardRef(() => RealtimeRedisModule),
    AdminAuditLogModule,
  ],
  controllers: [UserController, AdminUserController],
  providers: [
    UserService,
    UserRepository,
    AccountDeletionService,
    AdminUserService,
    AdminUserRepository,
  ],
  exports: [UserService],
})
export class UserModule {}
