import { Module } from '@nestjs/common';
import { LiveService } from './live.service';
import { StreamModule } from 'src/stream/stream.module';
import { LiveController } from './live.controller';
import { RealtimeRedisModule } from 'src/redis/redis.module';
import { UserModule } from 'src/user/user.module';
import { ManagerModule } from 'src/manager/manager.module';
import { BroadcastSettingModule } from 'src/broadcast-setting/broadcast-setting.module';
import { AdminAuditLogModule } from 'src/admin-audit-log/admin-audit-log.module';
import { AdminLiveController } from './admin-live.controller';
import { AdminLiveService } from './admin-live.service';

@Module({
  imports: [
    StreamModule,
    RealtimeRedisModule,
    UserModule,
    ManagerModule,
    BroadcastSettingModule,
    AdminAuditLogModule,
  ],
  controllers: [LiveController, AdminLiveController],
  providers: [LiveService, AdminLiveService],
  exports: [LiveService, AdminLiveService],
})
export class LiveModule {}
