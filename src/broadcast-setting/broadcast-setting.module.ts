import { Module } from '@nestjs/common';
import { BroadcastSettingService } from './broadcast-setting.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [BroadcastSettingService],
  exports: [BroadcastSettingService],
})
export class BroadcastSettingModule {}
