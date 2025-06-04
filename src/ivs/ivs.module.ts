import { forwardRef, Module } from '@nestjs/common';
import { IvsService } from './ivs.service';
import { IvsController } from './ivs.controller';
import { GraylogProviderModule } from 'src/graylog-provider/graylog-provider.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StreamModule } from 'src/stream/stream.module';
import { UserModule } from 'src/user/user.module';
import { IvsRepository } from './ivs.repository';
import { BroadcastSettingModule } from 'src/broadcast-setting/broadcast-setting.module';
import { ChattingRedisModule } from 'src/redis/redis.module';

@Module({
  imports: [
    GraylogProviderModule,
    PrismaModule,
    StreamModule,
    BroadcastSettingModule,
    ChattingRedisModule,
    forwardRef(() => UserModule),
  ],
  providers: [IvsService, IvsRepository],
  controllers: [IvsController],
  exports: [IvsService],
})
export class IvsModule {}
