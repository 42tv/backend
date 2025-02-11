import { Controller, Request, Post, Put, UseGuards } from '@nestjs/common';
import { IvsService } from './ivs.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { User } from 'src/user/entities/user.entity';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CreateIvsResponse } from './entities/create.channel.response';
import { CustomInternalServerErrorResponse } from 'src/utils/utils';

// 이 컨트롤러는 테스트 용임으로 차후 삭제할 예정
@Controller('ivs')
export class IvsController {
  constructor(private readonly ivsService: IvsService) {}

  @Post('stream-key')
  @ApiOperation({ summary: 'IVS 채널 생성' })
  @ApiResponse({
    status: 201,
    description: 'IVS 채널 생성 성공',
    type: CreateIvsResponse,
  })
  @ApiInternalServerErrorResponse({
    description: 'AWS IVS의 채널 생성 실패 케이스',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async createChannel(@Request() req) {
    const user: User = req.user;
    return await this.ivsService.updateIvsChannel(
      user.idx,
      user.userId.replace('@', '_'),
    );
  }

  @Put('stream-key')
  @ApiOperation({ summary: 'streamKey 재발급' })
  @ApiResponse({
    status: 201,
    description: 'streamKey 재발급 성공',
    type: CreateIvsResponse,
  })
  @ApiInternalServerErrorResponse({
    description: 'streamKey 재발급 실패',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  // ※스트림키 재발급의 경우 방송중인 경우에는 재발급이 불가능하게 막아야함. 아직 방송중 상태를 구현 안해놨음으로 차후 수정해야할 부분
  async reCreateStreamKey(@Request() req) {
    const user: User = req.user;
    return this.ivsService.reCreateStreamKey(user);
  }
}
