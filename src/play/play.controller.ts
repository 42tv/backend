import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { PlayService } from './play.service';
import { GuestGuard } from 'src/auth/guard/jwt.guest.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('play')
@Controller('play')
export class PlayController {
  constructor(private readonly playService: PlayService) {}

  @Post('')
  @UseGuards(GuestGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '방송 시청 시작' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['stream_id'],
      properties: {
        stream_id: {
          type: 'string',
          description: '시청할 스트리머의 ID',
          example: 'streamer123',
        },
        password: {
          type: 'string',
          description: '비밀번호가 설정된 방송의 경우 필요',
          example: '1234',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '방송 시청 정보 조회 성공',
    schema: {
      type: 'object',
      properties: {
        broadcaster_idx: { type: 'number', example: 1 },
        broadcaster_id: { type: 'string', example: 'streamer123' },
        broadcaster_nickname: { type: 'string', example: '스트리머닉네임' },
        playback_url: { type: 'string', example: 'https://ivs-playback-url' },
        title: { type: 'string', example: '오늘의 방송' },
        is_bookmarked: { type: 'boolean', example: false },
        profile_img: { type: 'string', example: 'https://profile-image-url' },
        nickname: { type: 'string', example: '스트리머닉네임' },
        play_cnt: { type: 'number', example: 150 },
        recommend_cnt: { type: 'number', example: 50 },
        start_time: { type: 'string', example: '2024-01-15T10:00:00Z' },
        play_token: { type: 'string', example: 'jwt-play-token' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          examples: [
            '존재하지 않는 스트리머입니다.',
            '방송중인 스트리머가 아닙니다.',
            '게스트는 시청할 수 없습니다',
            '비밀번호가 틀렸습니다',
            '탈퇴한 유저입니다.',
          ],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async play(@Req() req, @Body() body) {
    const isGuest = req.user.is_guest;
    const userIdx = req.user.idx;
    const guestId = req.user.guest_id;
    const { stream_id, password } = body;
    return await this.playService.play(
      userIdx,
      stream_id,
      isGuest,
      guestId,
      password,
    );
  }
}
