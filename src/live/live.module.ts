import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LiveService } from './live.service';
import { StreamModule } from 'src/stream/stream.module';
import { LiveController } from './live.controller';
import { RealtimeRedisModule } from 'src/redis/redis.module';
import { UserModule } from 'src/user/user.module';
import { ManagerModule } from 'src/manager/manager.module';
import { BroadcastSettingModule } from 'src/broadcast-setting/broadcast-setting.module';
import { AdminAuditLogModule } from 'src/admin-audit-log/admin-audit-log.module';
import { NcpLiveStationModule } from 'src/ncp-live-station/ncp-live-station.module';
import { AdminLiveController } from './admin-live.controller';
import { AdminLiveService } from './admin-live.service';

@Module({
  imports: [
    ConfigModule,
    StreamModule,
    RealtimeRedisModule,
    UserModule,
    ManagerModule,
    BroadcastSettingModule,
    AdminAuditLogModule,
    NcpLiveStationModule,
  ],
  controllers: [LiveController, AdminLiveController],
  providers: [LiveService, AdminLiveService],
  exports: [LiveService, AdminLiveService],
})
export class LiveModule {}
