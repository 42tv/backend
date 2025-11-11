import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FanLevelService } from './fan-level.service';
import { UpdateFanLevelDto } from './dto/update-fan-level.dto';
import { MemberGuard } from '../auth/guard/jwt.member.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';

@ApiTags('fan-level')
@Controller('fan-level')
export class FanLevelController {
  constructor(private readonly fanLevelService: FanLevelService) {}

  @Get('')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '사용자의 팬 레벨 정보 조회' })
  @ApiResponse({ status: 200, description: '사용자의 팬 레벨 정보 반환 성공' })
  async getFanLevels(@Req() req): Promise<SuccessResponseDto<any>> {
    const levels = await this.fanLevelService.findByUserIdx(req.user.idx);
    return ResponseWrapper.success(levels, '팬 레벨 정보를 조회했습니다.');
  }

  @Put('')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '사용자의 팬 레벨 설정 업데이트' })
  @ApiResponse({ status: 201, description: '팬 레벨 설정 업데이트 성공' })
  async updateFanLevels(
    @Req() req,
    @Body() updateFanLevelDto: UpdateFanLevelDto,
  ): Promise<SuccessResponseDto<any>> {
    const { levels } = updateFanLevelDto;
    const updated = await this.fanLevelService.updateFanLevels(
      req.user.idx,
      levels,
    );
    return ResponseWrapper.success(updated, '팬 레벨 설정을 업데이트했습니다.');
  }
}
