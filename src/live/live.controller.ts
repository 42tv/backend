import { Body, Controller, Get, Header, Post, Req, UseGuards } from '@nestjs/common';
import { LiveService } from './live.service';
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('live')
@Controller('live')
export class LiveController {
  constructor(private readonly liveService: LiveService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '실시간 방송 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '실시간 방송 목록 조회 성공',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        lives: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              thumbnail: {
                type: 'string',
                example: 'https://example.com/thumbnail.jpg',
              },
              start_time: { type: 'string', example: '2024-01-15T10:00:00Z' },
              play_cnt: { type: 'number', example: 150 },
              recommend_cnt: { type: 'number', example: 50 },
              viewerCount: { type: 'number', example: 75 },
              broadcaster: {
                type: 'object',
                properties: {
                  idx: { type: 'number', example: 1 },
                  user_id: { type: 'string', example: 'streamer123' },
                  nickname: { type: 'string', example: '스트리머' },
                  profile_img: {
                    type: 'string',
                    example: 'https://example.com/profile.jpg',
                  },
                  broadcastSetting: {
                    type: 'object',
                    properties: {
                      is_adult: { type: 'boolean', example: false },
                      is_fan: { type: 'boolean', example: false },
                      is_pw: { type: 'boolean', example: false },
                      title: { type: 'string', example: '오늘의 방송' },
                      fan_level: { type: 'number', example: 1 },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async getLiveList() {
    const liveList = await this.liveService.getLiveList();
    return {
      code: 200,
      message: 'success',
      lives: liveList,
    };
  }

  @Post('recommend')
  @UseGuards(MemberGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '실시간 방송 추천' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['broadcaster_idx'],
      properties: {
        broadcaster_idx: {
          type: 'number',
          description: '추천할 방송자의 user_idx',
          example: 5,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '추천 성공',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: {
          type: 'string',
          example: 'Live stream recommended successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '오늘 이미 추천한 경우',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: '오늘 이미 추천하셨습니다.' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '인증되지 않은 사용자',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async recommendLiveStream(
    @Req() req: any,
    @Body('broadcaster_idx') broadcaster_idx: number,
  ) {
    const recommender_idx = req.user.idx; // MemberGuard를 통해 설정된 사용자 정보
    await this.liveService.recommendLiveStream(
      recommender_idx,
      broadcaster_idx,
    );
    return {
      code: 200,
      message: 'Live stream recommended successfully',
    };
  }
}
