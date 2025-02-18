import { forwardRef, Module } from '@nestjs/common';
import { IvsService } from './ivs.service';
import { IvsController } from './ivs.controller';
import { GraylogProviderModule } from 'src/graylog-provider/graylog-provider.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StreamModule } from 'src/stream/stream.module';
import { UserModule } from 'src/user/user.module';
import { IvsRepository } from './ivs.repository';

@Module({
  imports: [
    GraylogProviderModule,
    PrismaModule,
    StreamModule,
    forwardRef(() => UserModule),
  ],
  providers: [IvsService, IvsRepository],
  controllers: [IvsController],
  exports: [IvsService],
})
export class IvsModule {}
