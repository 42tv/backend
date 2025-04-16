import { forwardRef, Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { LogModule } from 'src/log/log.module';
import { ChannelModule } from 'src/channel/channel.module';
import { UserRepository } from './user.repository';
import { IvsModule } from 'src/ivs/ivs.module';
import { FanLevelModule } from 'src/fan-level/fan-level.module';
import { BroadcastSettingModule } from 'src/broadcast-setting/broadcast-setting.module';
import { AwsModule } from 'src/aws/aws.module';

@Module({
  imports: [
    PrismaModule,
    LogModule,
    ChannelModule,
    FanLevelModule,
    BroadcastSettingModule,
    AwsModule,
    forwardRef(() => IvsModule),
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
