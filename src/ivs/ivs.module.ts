import { Module } from '@nestjs/common';
import { IvsService } from './ivs.service';
import { IvsController } from './ivs.controller';
import { GraylogProviderModule } from '../graylog-provider/graylog-provider.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [GraylogProviderModule, PrismaModule],
  providers: [IvsService],
  controllers: [IvsController],
  exports: [IvsService],
})
export class IvsModule {}
