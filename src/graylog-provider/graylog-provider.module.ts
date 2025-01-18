import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraylogModule, GraylogService } from 'nestjs-graylog';

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
  providers: [GraylogService],
  exports: [GraylogService],
})
export class GraylogProviderModule {}
