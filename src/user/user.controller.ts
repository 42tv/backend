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
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
  ApiConsumes,
  ApiParam,
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

@ApiTags('user')
@Controller('user')
@UsePipes(new ValidationPipe())
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('')
  @UseGuards(MemberGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '사용자 정보 조회' })
  @ApiResponse({
    status: 200,
    description: '사용자 정보 조회 성공',
    schema: {
      type: 'object',
      properties: {
        idx: { type: 'number', example: 1 },
        user_id: { type: 'string', example: 'user123' },
        profile_img: { type: 'string', example: 'https://profile-image-url' },
        nickname: { type: 'string', example: '사용자닉네임' },
      },
    },
  })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: '닉네임 변경' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['nickname'],
      properties: {
        nickname: { type: 'string', example: '새닉네임' },
      },
    },
  })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: '비밀번호 변경' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['password', 'new_password'],
      properties: {
        password: { type: 'string', example: 'current_password' },
        new_password: { type: 'string', example: 'new_password123' },
      },
    },
  })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: '프로필 이미지 업로드' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: '프로필 이미지 파일 (5MB 이하)',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: '업로드 성공',
    schema: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string', example: 'https://profile-image-url' },
      },
    },
  })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: '방송 제한설정 조회' })
  @ApiResponse({
    status: 200,
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
  @ApiBearerAuth()
  @ApiOperation({ summary: '방송 제한설정 변경' })
  @ApiBody({ type: BroadcastSettingDto })
  @ApiResponse({
    status: 200,
    description: '변경 성공',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '변경 성공' },
      },
    },
  })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: '북마크 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '북마크 목록 조회 성공',
  })
  async getBookmark(@Req() req) {
    const bookmarks = await this.userService.getBookmarks(req.user.idx);
    return bookmarks;
  }

  @Post('bookmark')
  @UseGuards(MemberGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '북마크 추가' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['user_id'],
      properties: {
        user_id: {
          type: 'string',
          description: '북마크할 사용자 ID',
          example: 'user123',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '북마크 추가 성공',
  })
  async addBookmark(@Req() req, @Body('user_id') user_id: string) {
    return await this.userService.addBookmark(req.user.idx, user_id);
  }

  @Delete('bookmark/:user_id')
  @UseGuards(MemberGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '북마크 삭제' })
  @ApiParam({
    name: 'user_id',
    type: 'string',
    description: '삭제할 북마크의 사용자 ID',
  })
  @ApiResponse({
    status: 200,
    description: '북마크 삭제 성공',
  })
  async deleteBookmark(@Req() req, @Param('user_id') deleted_user_id: string) {
    return await this.userService.deleteBookmark(req.user.idx, deleted_user_id);
  }

  @Delete('bookmarks')
  @UseGuards(MemberGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '북마크 일괄 삭제' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['ids'],
      properties: {
        ids: {
          type: 'array',
          items: { type: 'number' },
          description: '삭제할 북마크 ID 배열',
          example: [1, 2, 3],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '북마크 일괄 삭제 성공',
  })
  async deleteBookmakrs(@Req() req, @Body('ids') ids: number[]) {
    console.log(req.user.idx, ids);
    await this.userService.deleteBookmarks(req.user.idx, ids);
    return '';
  }
}
