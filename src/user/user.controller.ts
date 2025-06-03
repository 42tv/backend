import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
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
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';
import { BroadcastSettingDto } from './dto/broadcast-setting.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';

@Controller('user')
@UsePipes(new ValidationPipe())
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('')
  @UseGuards(MemberGuard)
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

  @Patch('nickname')
  @UseGuards(MemberGuard)
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

  @Patch('password')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '비밀번호 변경' })
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

  @Post('profile')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 1024 * 1024 * 5, // 5MB
      },
    }),
  )
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '프로필 이미지 업로드' })
  @ApiCreatedResponse({ description: '업로드 성공' })
  @ApiBadRequestResponse({
    description: '파일 형식 불일치 | 파일 크기 초과 | 존재하지 않는 유저',
    type: CustomBadRequestResponse,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  async uploadProfileImage(
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const profileImageUrl = await this.userService.uploadProfileImage(
      req.user.idx,
      file,
    );
    return { imageUrl: profileImageUrl };
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
  @UseGuards(MemberGuard)
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
    const broadcastSetting = await this.userService.getBroadcastSetting(
      req.user.idx,
    );
    delete broadcastSetting.ivs.playback_url;
    return broadcastSetting;
  }

  @Put('broadcast-setting')
  @UseGuards(MemberGuard)
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

  @Get('bookmark')
  @UseGuards(MemberGuard)
  async getBookmark(@Req() req) {
    const bookmarks = await this.userService.getBookmarks(req.user.idx);
    return bookmarks;
  }

  @Post('bookmark')
  @UseGuards(MemberGuard)
  async addBookmark(@Req() req, @Body('user_id') user_id: string) {
    return await this.userService.addBookmark(req.user.idx, user_id);
  }

  @Delete('bookmark/:user_id')
  @UseGuards(MemberGuard)
  async deleteBookmark(@Req() req, @Param('user_id') deleted_user_id: string) {
    return await this.userService.deleteBookmark(req.user.idx, deleted_user_id);
  }

  @Delete('bookmarks')
  @UseGuards(MemberGuard)
  async deleteBookmakrs(@Req() req, @Body('ids') ids: number[]) {
    console.log(req.user.idx, ids);
    await this.userService.deleteBookmarks(req.user.idx, ids);
    return '';
  }
}
