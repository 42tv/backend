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
import { PlayResponse } from './interfaces/response';
import { PlayStreamDto } from './dto/play-request.dto';
import {
  PlayStreamResponseDto,
  PlayErrorResponseDto,
  PlayForbiddenResponseDto,
} from './dto/play-response.dto';

@ApiTags('play')
@Controller('play')
export class PlayController {
  constructor(private readonly playService: PlayService) {}

  @Post('')
  @UseGuards(GuestGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '방송 시청 시작' })
  @ApiBody({ type: PlayStreamDto })
  @ApiResponse({
    status: 201,
    description: '방송 시청 정보 조회 성공',
    type: PlayStreamResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청',
    type: PlayErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: '접근 금지',
    type: PlayForbiddenResponseDto,
  })
  async play(@Req() req, @Body() body: PlayStreamDto): Promise<PlayResponse> {
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
