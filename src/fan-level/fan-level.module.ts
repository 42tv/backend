import { Module } from '@nestjs/common';
import { FanLevelService } from './fan-level.service';
import { FanLevelController } from './fan-level.controller';
import { FanLevelRepository } from './fan-level.repository';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FanLevelService, FanLevelRepository],
  controllers: [FanLevelController],
  exports: [FanLevelService],
})
export class FanLevelModule {}
