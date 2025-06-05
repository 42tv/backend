import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FanLevelService } from './fan-level.service';
import { UpdateFanLevelDto } from './dto/update-fan-level.dto';
import { MemberGuard } from '../auth/guard/jwt.member.guard';

@ApiTags('fan-level')
@Controller('fan-level')
export class FanLevelController {
  constructor(private readonly fanLevelService: FanLevelService) {}

  @Get('')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '사용자의 팬 레벨 정보 조회' })
  @ApiResponse({ status: 200, description: '사용자의 팬 레벨 정보 반환 성공' })
  async getFanLevels(@Req() req) {
    return await this.fanLevelService.findByUserIdx(req.user.idx);
  }

  @Post('')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '사용자의 팬 레벨 설정 업데이트' })
  @ApiResponse({ status: 201, description: '팬 레벨 설정 업데이트 성공' })
  async updateFanLevels(@Req() req, @Body() updateFanLevelDto: UpdateFanLevelDto) {
    const { levels } = updateFanLevelDto;
    return await this.fanLevelService.updateFanLevels(req.user.idx, levels);
  }
}
