import { Module } from '@nestjs/common';
import { PlayController } from './play.controller';
import { PlayService } from './play.service';
import { UserModule } from 'src/user/user.module';
import { BroadcastSettingModule } from 'src/broadcast-setting/broadcast-setting.module';

@Module({
  imports: [UserModule, BroadcastSettingModule],
  controllers: [PlayController],
  providers: [PlayService],
  exports: [PlayService],
})
export class PlayModule {}
