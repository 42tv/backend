import { forwardRef, Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';
import { EventsGateway } from './chat.gateway';
import { ChattingRedisModule } from 'src/redis/redis.module';
import { StreamModule } from 'src/stream/stream.module';
import { FanModule } from 'src/fan/fan.module';
import { ManagerModule } from 'src/manager/manager.module';

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => StreamModule),
    forwardRef(() => ChattingRedisModule),
    FanModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, EventsGateway],
  exports: [EventsGateway],
})
export class ChatModule {}
