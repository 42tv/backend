import { Module } from '@nestjs/common';
import { ManagerService } from './manager.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ManagerController } from './manager.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [ManagerService],
  exports: [ManagerService],
  controllers: [ManagerController],
})
export class ManagerModule {}
