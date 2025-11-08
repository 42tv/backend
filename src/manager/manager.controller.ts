import { Body, Controller, Delete, Post, Req, UseGuards } from '@nestjs/common';
import { ManagerService } from './manager.service';
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';
import { AddManagerDto } from './dto/add.manager.dto';
import { RemoveManagerDto } from './dto/remove.manager.dto';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';

@Controller('manager')
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Post()
  @UseGuards(MemberGuard)
  async addManager(
    @Req() req,
    @Body() addManagerDto: AddManagerDto,
  ): Promise<SuccessResponseDto<{ manager: any }>> {
    const manager = await this.managerService.addManager(
      req.user.idx,
      addManagerDto,
    );
    return ResponseWrapper.success({ manager }, '매니저를 추가했습니다.');
  }

  @Delete()
  @UseGuards(MemberGuard)
  async removeManager(
    @Req() req,
    @Body() removeManagerDto: RemoveManagerDto,
  ): Promise<SuccessResponseDto<null>> {
    await this.managerService.removeManager(req.user.idx, removeManagerDto);
    return ResponseWrapper.success(null, '매니저를 제거했습니다.');
  }
}
