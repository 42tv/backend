import { Module } from '@nestjs/common';
import { PlayController } from './play.controller';
import { PlayService } from './play.service';
import { UserModule } from 'src/user/user.module';
import { StreamModule } from 'src/stream/stream.module';

@Module({
  imports: [UserModule, StreamModule],
  controllers: [PlayController],
  providers: [PlayService],
  exports: [PlayService],
})
export class PlayModule {}
