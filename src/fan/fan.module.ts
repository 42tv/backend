import { Module } from '@nestjs/common';
import { FanService } from './fan.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [],
  exports: [FanService],
  providers: [FanService],
})
export class FanModule {}
