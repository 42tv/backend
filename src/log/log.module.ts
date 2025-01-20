import { Module } from '@nestjs/common';
import { LogService } from './log.service';
import { GraylogModule } from 'nestjs-graylog';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    GraylogModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        servers: [
          {
            host: configService.get('GRAYLOG_HOST'),
            port: 12201,
          },
        ],
      }),
    }),
  ],
  exports: [LogService],
  providers: [LogService],
})
export class LogModule {}
