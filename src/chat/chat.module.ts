import { forwardRef, Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';
import { EventsGateway } from './chat.gateway';
import { StreamViewerModule } from 'src/stream-viewer/stream-viewer.module';
import { ChattingRedisModule } from 'src/redis/redis.module';
import { StreamModule } from 'src/stream/stream.module';

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => StreamModule),
    forwardRef(() => ChattingRedisModule),
  ],
  controllers: [ChatController],
  providers: [ChatService, EventsGateway],
  exports: [EventsGateway],
})
export class ChatModule {}
