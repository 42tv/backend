import { Body, Controller, Delete, Post, Req, UseGuards } from '@nestjs/common';
import { ManagerService } from './manager.service';
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';
import { AddManagerDto } from './dto/add.manager.dto';
import { RemoveManagerDto } from './dto/remove.manager.dto';

@Controller('manager')
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Post()
  @UseGuards(MemberGuard)
  async addManager(@Req() req, @Body() addManagerDto: AddManagerDto) {
    return await this.managerService.addManager(req.user.idx, addManagerDto);
  }

  @Delete()
  @UseGuards(MemberGuard)
  async removeManager(@Req() req, @Body() removeManagerDto: RemoveManagerDto) {
    return await this.managerService.removeManager(
      req.user.idx,
      removeManagerDto,
    );
  }
}
