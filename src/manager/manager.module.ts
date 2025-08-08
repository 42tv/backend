import { forwardRef, Module } from '@nestjs/common';
import { ManagerService } from './manager.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ManagerController } from './manager.controller';
import { AuthModule } from 'src/auth/auth.module';
import { ManagerRepository } from './manager.repository';
import { ChattingRedisModule } from 'src/redis/redis.module';
import { FanModule } from 'src/fan/fan.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    forwardRef(() => ChattingRedisModule),
    forwardRef(() => FanModule),
  ],
  providers: [ManagerService, ManagerRepository],
  exports: [ManagerService],
  controllers: [ManagerController],
})
export class ManagerModule {}
