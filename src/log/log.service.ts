import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GraylogService } from 'nestjs-graylog';

@Injectable()
export class LogService {
  env = this.configService.get('ENV');
  constructor(
    private graylogService: GraylogService,
    private configService: ConfigService,
  ) {}

  async logError(subject: string, data: any = {}) {
    await this.graylogService.error(subject, ...data);
  }

  async logInfo(subject: string, data: any = {}) {
    await this.graylogService.info(subject, ...data);
    return;
  }

  async logDebug(subject: string, data: any = {}) {
    if (this.env == 'dev') {
      await this.graylogService.debug(subject, ...data);
    }
    return;
  }

  //   async logQuery(panda_id: string, description: string, data: any = {}) {
  //     await this.graylogService.debug('EXECUTE_QUERY', {
  //       panda_id: panda_id,
  //       description: description,
  //       data: data,
  //     });
  //     return;
  //   }

  //   async logAPIStart(description: string) {
  //     await this.graylogService.debug('API_START', {
  //       description: description,
  //     });
  //   }

  //   async logAPIEnd(description: string, duration: number) {
  //     await this.graylogService.debug('API_END', {
  //       description: description,
  //       duration: duration + 'ms',
  //     });
  //   }
}
