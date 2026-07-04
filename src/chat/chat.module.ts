import { forwardRef, Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';
import { EventsGateway } from './chat.gateway';
import { RealtimeRedisModule } from 'src/redis/redis.module';
import { StreamModule } from 'src/stream/stream.module';
import { FanModule } from 'src/fan/fan.module';
import { ManagerModule } from 'src/manager/manager.module';
import { BannedWordModule } from 'src/banned-word/banned-word.module';
import { AdminAuditLogModule } from 'src/admin-audit-log/admin-audit-log.module';
import { AdminChatController } from './admin-chat.controller';

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => StreamModule),
    forwardRef(() => RealtimeRedisModule),
    FanModule,
    ManagerModule,
    forwardRef(() => BannedWordModule),
    AdminAuditLogModule,
  ],
  controllers: [ChatController, AdminChatController],
  providers: [ChatService, EventsGateway],
  exports: [EventsGateway],
})
export class ChatModule {}
