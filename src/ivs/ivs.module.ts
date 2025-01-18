import { Module } from '@nestjs/common';
import { IvsService } from './ivs.service';
import { IvsController } from './ivs.controller';
import { GraylogProviderModule } from 'src/graylog-provider/graylog-provider.module';

@Module({
  imports: [GraylogProviderModule],
  providers: [IvsService],
  controllers: [IvsController],
  exports: [IvsService],
})
export class IvsModule {}
