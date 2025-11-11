import {
  Controller,
  Request,
  Post,
  Put,
  UseGuards,
  Body,
  Delete,
  Logger,
} from '@nestjs/common';
import { IvsService } from './ivs.service';
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';
import { User } from 'src/user/entities/user.entity';
import { WebhookGuard } from './guards/webhook.guard';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { CreateIvsResponseDto } from './dto/ivs-response.dto';
import { CustomInternalServerErrorResponse } from 'src/utils/utils';
import { IvsEventDto } from './dto/ivs-request.dto';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';

// 이 컨트롤러는 테스트 용임으로 차후 삭제할 예정
@ApiTags('ivs')
@Controller('ivs')
export class IvsController {
  private readonly logger = new Logger(IvsController.name);

  constructor(private readonly ivsService: IvsService) {}

  @Post('stream-key')
  @ApiOperation({ summary: 'IVS 채널 생성' })
  @ApiResponse({
    status: 201,
    description: 'IVS 채널 생성 성공',
    type: CreateIvsResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'AWS IVS의 채널 생성 실패 케이스',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBearerAuth()
  @UseGuards(MemberGuard)
  async createChannel(@Request() req): Promise<SuccessResponseDto<any>> {
    const user: User = req.user;
    const channel = await this.ivsService.updateIvsChannel(
      user.idx,
      user.userId.replace('@', '_'),
    );
    return ResponseWrapper.success(channel, 'IVS 채널을 생성했습니다.');
  }

  @Put('stream-key')
  @ApiOperation({ summary: 'streamKey 재발급' })
  @ApiResponse({
    status: 201,
    description: 'streamKey 재발급 성공',
    type: CreateIvsResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'streamKey 재발급 실패',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBearerAuth()
  @UseGuards(MemberGuard)
  // ※스트림키 재발급의 경우 방송중인 경우에는 재발급이 불가능하게 막아야함. 아직 방송중 상태를 구현 안해놨음으로 차후 수정해야할 부분
  async reCreateStreamKey(@Request() req): Promise<SuccessResponseDto<any>> {
    const user: User = req.user;
    const streamKey = await this.ivsService.reCreateStreamKey(user);
    return ResponseWrapper.success(streamKey, '스트림 키를 재발급했습니다.');
  }

  @Post('callback/lambda')
  @UseGuards(WebhookGuard)
  @ApiOperation({ summary: 'IVS 콜백 람다' })
  @ApiBody({ type: IvsEventDto })
  @ApiResponse({
    status: 201,
    description: '콜백 처리 성공',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'success' },
      },
    },
  })
  async ivsLambdaCallback(
    @Body() ivsEvent: IvsEventDto,
  ): Promise<SuccessResponseDto<null>> {
    const startTime = Date.now();

    // 보안 로깅
    this.logger.log(
      `웹훅 수신: ${ivsEvent.eventName} for ${ivsEvent.channelName}`,
    );

    try {
      // 기존 로직 실행
      console.log(ivsEvent);
      await this.ivsService.handleCallbackStreamEvent(ivsEvent);

      this.logger.log(`웹훅 처리 완료: ${Date.now() - startTime}ms`);
      return ResponseWrapper.success(null, 'success');
    } catch (error) {
      this.logger.error(`웹훅 처리 실패: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('callback/test')
  @ApiOperation({ summary: 'S3 콜백 테스트 (테스트용)' })
  @ApiResponse({
    status: 201,
    description: '테스트 성공',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'success' },
      },
    },
  })
  async ivsCallbackTest(@Body() ivsEvnet): Promise<SuccessResponseDto<null>> {
    console.log('========this is s3 callback test ==============');
    console.log(ivsEvnet);
    console.log(ivsEvnet.Records[0].s3);
    return ResponseWrapper.success(null, 'success');
  }

  @Delete('sync-channels')
  @ApiOperation({ summary: 'IVS 채널 동기화 및 고아 채널 삭제' })
  @ApiResponse({
    status: 200,
    description: '동기화 완료',
  })
  async syncChannels(): Promise<SuccessResponseDto<any>> {
    const result = await this.ivsService.syncAndDeleteOrphanedChannels();
    return ResponseWrapper.success(result, 'IVS 채널을 동기화했습니다.');
  }
}
