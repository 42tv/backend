import {
  Body,
  Controller,
  Get,
  Post,
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
