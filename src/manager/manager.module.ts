import { Module } from '@nestjs/common';
import { ManagerService } from './manager.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ManagerService],
  exports: [ManagerService],
})
export class ManagerModule {}
