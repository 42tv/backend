import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { IvsService } from './ivs/ivs.service';
import { IvsModule } from './ivs/ivs.module';
import { GraylogProviderModule } from './graylog-provider/graylog-provider.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [ConfigModule.forRoot(), IvsModule, GraylogProviderModule, UserModule],
  controllers: [AppController],
  providers: [AppService, IvsService],
})
export class AppModule {}
