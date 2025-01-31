import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LogModule } from '../log/log.module';
import { ChannelModule } from '../channel/channel.module';

@Module({
  imports: [PrismaModule, LogModule, ChannelModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
