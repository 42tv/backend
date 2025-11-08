import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ResponseWrapper } from './common/utils/response-wrapper.util';
import { SuccessResponseDto } from './common/dto/success-response.dto';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: '헬스체크' })
  @ApiResponse({
    status: 200,
    description: '서버 상태 확인',
    schema: {
      type: 'string',
      example: 'Hello World!',
    },
  })
  getHello(): SuccessResponseDto<{ status: string }> {
    const status = this.appService.getHello();
    return ResponseWrapper.success({ status }, '서버 상태를 확인했습니다.');
  }
}
