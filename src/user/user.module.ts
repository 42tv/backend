import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { LogModule } from 'src/log/log.module';
import { ChannelModule } from 'src/channel/channel.module';
import { UserRepository } from './user.repository';
import { IvsModule } from 'src/ivs/ivs.module';

@Module({
  imports: [PrismaModule, LogModule, ChannelModule, IvsModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
