import {
  ExceptionFilter,
  ArgumentsHost,
  HttpStatus,
  HttpException,
  Catch,
} from '@nestjs/common';
import { Response } from 'express';
import { GraylogService } from 'nestjs-graylog';

@Catch()
export class ExceptionfilterFormat implements ExceptionFilter {
  constructor(private readonly graylogService: GraylogService) {}
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    // const request = ctx.getRequest<Request>();
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      httpStatus == 500
        ? '내부 서버 오류가 발생하였습니다.'
        : exception.message;
    if (httpStatus == 500) {
      this.graylogService.error(exception.stack);
    }
    console.log('filter: ', exception.stack);
    response.status(httpStatus).json({
      code: httpStatus,
      message: message,
    });
  }
}
