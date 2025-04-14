import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { User } from './entities/user.entity';
import {
  CustomBadRequestResponse,
  CustomInternalServerErrorResponse,
} from 'src/utils/utils';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { BroadcastSettingDto } from './dto/broadcast-setting.dto';

@Controller('user')
@UsePipes(new ValidationPipe())
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('')
  @UseGuards(JwtAuthGuard)
  async getUser(@Req() req) {
    const user = await this.userService.findByUserIdx(req.user.idx);
    const result = {
      idx: user.idx,
      user_id: user.user_id,
      profile_img: user.profile_img,
      nickname: user.nickname,
    };
    return result;
  }

  @Put('nickname')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '닉네임 변경' })
  @ApiCreatedResponse({
    description: '변경 성공',
    type: User,
  })
  @ApiBadRequestResponse({
    description: '이미 존재하는 닉네임입니다.',
    type: CustomBadRequestResponse,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  async updateNickname(@Req() req, @Body('nickname') nickname) {
    return await this.userService.updateNickname(req.user.idx, nickname);
  }

  @Put('password')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '닉네임 변경' })
  @ApiCreatedResponse({ description: '변경 성공', type: User })
  @ApiBadRequestResponse({
    description: '비밀번호가 틀렸습니다 | 존재하지 않는 유저',
    type: CustomBadRequestResponse,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  async updatePassword(
    @Req() req,
    @Body('password') password,
    @Body('new_password') new_password,
  ) {
    return await this.userService.updatePassword(
      req.user.idx,
      password,
      new_password,
    );
  }

  @Post('')
  @ApiOperation({ summary: '유저생성' })
  @ApiCreatedResponse({ description: '생성 성공', type: User })
  @ApiBadRequestResponse({
    description: '이미 존재하는 아이디입니다.',
    type: CustomBadRequestResponse,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBody({ description: 'Body 데이터', type: CreateUserDto, required: true })
  async createUser(@Body() createUserDto: CreateUserDto) {
    return await this.userService.createUser(createUserDto);
  }

  @Get('broadcast-setting')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '방송 제한설정 조회' })
  @ApiCreatedResponse({
    description: '조회 성공',
  })
  @ApiBadRequestResponse({
    description: '존재하지 않는 프리셋입니다.',
    type: CustomBadRequestResponse,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  async getBroadcastPreset(@Req() req) {
    return await this.userService.getBroadcastSetting(req.user.idx);
  }

  @Put('broadcast-setting')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '방송 제한설정 변경' })
  @ApiCreatedResponse({ description: '변경 성공', type: User })
  @ApiBadRequestResponse({
    description: '존재하지 않는 프리셋입니다.',
    type: CustomBadRequestResponse,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  async updateBroadcastPreset(
    @Req() req,
    @Body() settingDto: BroadcastSettingDto,
  ) {
    console.log(settingDto);
    await this.userService.updateBroadcastSetting(req.user.idx, settingDto);
    return {
      message: '변경 성공',
    };
  }
}
