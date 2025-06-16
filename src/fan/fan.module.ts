import { Module } from '@nestjs/common';
import { FanService } from './fan.service';
import { FanRepository } from './fan.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FanLevelModule } from 'src/fan-level/fan-level.module';

@Module({
  imports: [PrismaModule, FanLevelModule],
  controllers: [],
  exports: [FanService, FanRepository],
  providers: [FanService, FanRepository],
})
export class FanModule {}
