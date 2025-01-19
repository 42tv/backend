import { Injectable } from '@nestjs/common';
import { GraylogService } from 'nestjs-graylog';

@Injectable()
export class LogService {
  constructor(private graylogService: GraylogService) {}

  async logError() {
    await this.graylogService.error('ERROR_MESSAGE', {});
  }

  async logInfo() {
    await this.graylogService.info('INFO_MESSAGE', {});
    return;
  }

  async logDebug() {
    await this.graylogService.debug('DEBUG_MESSAGE', {});
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
