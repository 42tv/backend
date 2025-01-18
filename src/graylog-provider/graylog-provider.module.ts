import { Module } from '@nestjs/common';
import { GraylogModule, GraylogService } from 'nestjs-graylog';

@Module({
  imports: [
    GraylogModule.register({
      servers: [{ host: '127.0.0.1', port: 12201 }],
      hostname: '42tvp_backend', // optional, default: os.hostname()
      facility: 'Node.js', // optional, default: Node.js
      bufferSize: 1400, // optional, default: 1400
    }),
  ],
  providers: [GraylogService],
  exports: [GraylogService],
})
export class GraylogProviderModule {}
