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
import { ChangePasswordDto } from './dto/change.password.dto';

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
  @ApiCreatedResponse({ description: '변경 성공', type: User })
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
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return await this.userService.updatePassword(
      req.user.idx,
      changePasswordDto.password,
      changePasswordDto.new_password,
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
}
