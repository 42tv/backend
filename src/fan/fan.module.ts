import { Module } from '@nestjs/common';
import { FanService } from './fan.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FanLevelModule } from 'src/fan-level/fan-level.module';

@Module({
  imports: [PrismaModule, FanLevelModule],
  controllers: [],
  exports: [FanService],
  providers: [FanService],
})
export class FanModule {}
