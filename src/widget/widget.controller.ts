import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';
import { GetUser } from 'src/auth/get-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/auth.interface';
import { WidgetService } from './widget.service';
import { CreateWidgetTokenDto } from './dto/create-widget-token.dto';
import { UpdateChatConfigDto } from './dto/update-chat-config.dto';
import { UpdateGoalConfigDto } from './dto/update-goal-config.dto';

@Controller('widget')
export class WidgetController {
  constructor(private readonly widgetService: WidgetService) {}

  @Get('config/:token')
  getConfig(@Param('token') token: string) {
    return this.widgetService.getConfig(token);
  }

  @UseGuards(MemberGuard)
  @Get('my')
  getMyTokens(@GetUser() user: AuthenticatedUser) {
    return this.widgetService.getMyTokens(user.idx);
  }

  @UseGuards(MemberGuard)
  @Post()
  createToken(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: CreateWidgetTokenDto,
  ) {
    return this.widgetService.createToken(user.idx, dto);
  }

  @UseGuards(MemberGuard)
  @Put('chat-config')
  updateChatConfig(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: UpdateChatConfigDto,
  ) {
    return this.widgetService.updateChatConfig(user.idx, dto);
  }

  @UseGuards(MemberGuard)
  @Put('goal-config')
  updateGoalConfig(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: UpdateGoalConfigDto,
  ) {
    return this.widgetService.updateGoalConfig(user.idx, dto);
  }
}
