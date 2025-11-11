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
  AddToBlacklistDto,
  RemoveFromBlacklistDto,
  RemoveMultipleFromBlacklistDto,
} from './dto/blacklist.dto';
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
import { CustomInternalServerErrorResponse } from 'src/utils/utils';
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';
import { BroadcastSettingDto } from './dto/broadcast-setting.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
// Profile upload DTO import
import { ProfileImageUploadDto } from './dto/profile-upload.dto';
// User 응답/요청 DTO imports
import {
  GetUserResponseDto,
  UpdateNicknameResponseDto,
  UpdatePasswordResponseDto,
  ProfileImageUploadResponseDto,
  CreateUserResponseDto,
  GetUserProfileResponseDto,
  UserErrorResponseDto,
} from './dto/user-response.dto';
import {
  UpdateNicknameRequestDto,
  UpdatePasswordRequestDto,
} from './dto/user-request.dto';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';

@ApiTags('User - 사용자 관리 API (AWS S3 파일 업로드 포함)')
@Controller('user')
@UsePipes(new ValidationPipe())
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('')
  @UseGuards(MemberGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '사용자 정보 조회 (코인 잔액 포함)' })
  @ApiResponse({
    status: 200,
    description: '사용자 정보 조회 성공',
    type: GetUserResponseDto,
  })
  @ApiBadRequestResponse({
    description: '사용자 조회 실패',
    type: UserErrorResponseDto,
  })
  async getUser(@Req() req): Promise<SuccessResponseDto<GetUserResponseDto>> {
    const user = await this.userService.getUserWithCoin(req.user.idx);
    return ResponseWrapper.success({ user }, '사용자 정보를 조회했습니다.');
  }

  @Patch('nickname')
  @UseGuards(MemberGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '닉네임 변경' })
  @ApiBody({ type: UpdateNicknameRequestDto })
  @ApiCreatedResponse({
    description: '닉네임 변경 성공',
    type: UpdateNicknameResponseDto,
  })
  @ApiBadRequestResponse({
    description: '이미 존재하는 닉네임입니다.',
    type: UserErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  async updateNickname(
    @Req() req,
    @Body() updateNicknameDto: UpdateNicknameRequestDto,
  ): Promise<SuccessResponseDto<{ nickname: string }>> {
    await this.userService.updateNickname(
      req.user.idx,
      updateNicknameDto.nickname,
    );
    return ResponseWrapper.success(
      { nickname: updateNicknameDto.nickname },
      '닉네임이 성공적으로 변경되었습니다.',
    );
  }

  @Patch('password')
  @UseGuards(MemberGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '비밀번호 변경' })
  @ApiBody({ type: UpdatePasswordRequestDto })
  @ApiCreatedResponse({
    description: '비밀번호 변경 성공',
    type: UpdatePasswordResponseDto,
  })
  @ApiBadRequestResponse({
    description: '비밀번호가 틀렸습니다 | 존재하지 않는 유저',
    type: UserErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  async updatePassword(
    @Req() req,
    @Body() updatePasswordDto: UpdatePasswordRequestDto,
  ): Promise<SuccessResponseDto<null>> {
    await this.userService.updatePassword(
      req.user.idx,
      updatePasswordDto.currentPassword,
      updatePasswordDto.newPassword,
    );
    return ResponseWrapper.success(
      null,
      '비밀번호가 성공적으로 변경되었습니다.',
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
  @ApiOperation({
    summary: '프로필 이미지 업로드',
    description:
      '사용자의 프로필 이미지를 AWS S3에 업로드합니다. 최대 5MB까지 지원합니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'AWS S3 업로드용 프로필 이미지 (Swagger용)',
    type: ProfileImageUploadDto,
  })
  @ApiCreatedResponse({
    description: 'AWS S3 업로드 성공',
    type: ProfileImageUploadResponseDto,
  })
  @ApiBadRequestResponse({
    description: '파일 형식 불일치 | 파일 크기 초과 | 존재하지 않는 유저',
    type: UserErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'AWS S3 업로드 실패 또는 서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  async uploadProfileImage(
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<SuccessResponseDto<{ imageUrl: string }>> {
    const profileImageUrl = await this.userService.uploadProfileImage(
      req.user.idx,
      file,
    );
    return ResponseWrapper.success(
      { imageUrl: profileImageUrl },
      '프로필 이미지가 성공적으로 업로드되었습니다.',
    );
  }

  @Post('')
  @ApiOperation({ summary: '유저생성' })
  @ApiCreatedResponse({
    description: '사용자 생성 성공',
    type: CreateUserResponseDto,
  })
  @ApiBadRequestResponse({
    description: '이미 존재하는 아이디입니다.',
    type: UserErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBody({ description: 'Body 데이터', type: CreateUserDto, required: true })
  async createUser(@Body() createUserDto: CreateUserDto): Promise<
    SuccessResponseDto<{
      user: {
        idx: number;
        user_id: string;
        profile_img: string;
        nickname: string;
      };
    }>
  > {
    const newUser = await this.userService.createUser(createUserDto);
    return ResponseWrapper.success(
      {
        user: {
          idx: newUser.idx,
          user_id: newUser.user_id,
          profile_img: newUser.profile_img,
          nickname: newUser.nickname,
        },
      },
      '사용자가 성공적으로 생성되었습니다.',
    );
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
    type: UserErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  async getBroadcastPreset(
    @Req() req,
  ): Promise<SuccessResponseDto<Record<string, unknown>>> {
    const broadcastSetting = await this.userService.getBroadcastSetting(
      req.user.idx,
    );
    delete broadcastSetting.ivs.playback_url;
    return ResponseWrapper.success(
      broadcastSetting,
      '방송 제한 설정을 조회했습니다.',
    );
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
    type: UserErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  async updateBroadcastPreset(
    @Req() req,
    @Body() settingDto: BroadcastSettingDto,
  ): Promise<SuccessResponseDto<null>> {
    console.log(settingDto);
    await this.userService.updateBroadcastSetting(req.user.idx, settingDto);
    return ResponseWrapper.success(null, '방송 제한 설정을 변경했습니다.');
  }

  @Get('bookmark')
  @UseGuards(MemberGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '북마크 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '북마크 목록 조회 성공',
  })
  async getBookmark(
    @Req() req,
  ): Promise<SuccessResponseDto<{ lists: unknown[] }>> {
    const { lists, message } = await this.userService.getBookmarks(
      req.user.idx,
    );
    return ResponseWrapper.success({ lists }, message);
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
  async addBookmark(
    @Req() req,
    @Body('user_id') user_id: string,
  ): Promise<SuccessResponseDto<null>> {
    const { message } = await this.userService.addBookmark(
      req.user.idx,
      user_id,
    );
    return ResponseWrapper.success(null, message);
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
  async deleteBookmark(
    @Req() req,
    @Param('user_id') deleted_user_id: string,
  ): Promise<SuccessResponseDto<null>> {
    const { message } = await this.userService.deleteBookmark(
      req.user.idx,
      deleted_user_id,
    );
    return ResponseWrapper.success(null, message);
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
  async deleteBookmakrs(
    @Req() req,
    @Body('ids') ids: number[],
  ): Promise<SuccessResponseDto<null>> {
    console.log(req.user.idx, ids);
    const { message } = await this.userService.deleteBookmarks(
      req.user.idx,
      ids,
    );
    return ResponseWrapper.success(null, message);
  }

  @Get('blacklist')
  @UseGuards(MemberGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '블랙리스트 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '블랙리스트 목록 조회 성공',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          created_at: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
          blocked: {
            type: 'object',
            properties: {
              idx: { type: 'number', example: 2 },
              user_id: { type: 'string', example: 'blocked_user' },
              nickname: { type: 'string', example: '차단된사용자' },
              profile_img: {
                type: 'string',
                example: 'https://profile-image-url',
              },
            },
          },
        },
      },
    },
  })
  async getBlacklist(
    @Req() req,
  ): Promise<SuccessResponseDto<{ lists: unknown[] }>> {
    const { lists, message } = await this.userService.getBlacklist(
      req.user.idx,
    );
    return ResponseWrapper.success({ lists }, message);
  }

  @Post('blacklist')
  @UseGuards(MemberGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '블랙리스트에 사용자 추가' })
  @ApiBody({ type: AddToBlacklistDto })
  @ApiResponse({
    status: 201,
    description: '블랙리스트 추가 성공',
  })
  @ApiBadRequestResponse({
    description:
      '자기 자신을 차단할 수 없습니다. | 이미 차단된 사용자입니다. | 존재하지 않는 사용자입니다.',
    type: UserErrorResponseDto,
  })
  async addToBlacklist(
    @Req() req,
    @Body() dto: AddToBlacklistDto,
  ): Promise<SuccessResponseDto<unknown>> {
    const result = await this.userService.addToBlacklist(
      req.user.idx,
      dto.blocked_user_id,
    );
    return ResponseWrapper.success(
      result,
      '블랙리스트에 사용자를 추가했습니다.',
    );
  }

  @Delete('blacklist')
  @UseGuards(MemberGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '블랙리스트에서 사용자 제거' })
  @ApiBody({ type: RemoveFromBlacklistDto })
  @ApiResponse({
    status: 200,
    description: '블랙리스트 제거 성공',
  })
  @ApiBadRequestResponse({
    description: '차단되지 않은 사용자입니다. | 존재하지 않는 사용자입니다.',
    type: UserErrorResponseDto,
  })
  async removeFromBlacklist(
    @Req() req,
    @Body() dto: RemoveFromBlacklistDto,
  ): Promise<SuccessResponseDto<unknown>> {
    const result = await this.userService.removeFromBlacklist(
      req.user.idx,
      dto.blocked_user_id,
    );
    return ResponseWrapper.success(
      result,
      '블랙리스트에서 사용자를 제거했습니다.',
    );
  }

  @Delete('blacklists')
  @UseGuards(MemberGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '블랙리스트에서 여러 사용자 일괄 제거' })
  @ApiBody({ type: RemoveMultipleFromBlacklistDto })
  @ApiResponse({
    status: 200,
    description: '블랙리스트 일괄 제거 성공',
    schema: {
      type: 'object',
      properties: {
        deletedCount: { type: 'number', example: 3 },
        message: {
          type: 'string',
          example: '3명의 사용자를 블랙리스트에서 제거했습니다.',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: '유효한 사용자가 없습니다.',
    type: UserErrorResponseDto,
  })
  async removeMultipleFromBlacklist(
    @Req() req,
    @Body() dto: RemoveMultipleFromBlacklistDto,
  ): Promise<SuccessResponseDto<{ deletedCount: number }>> {
    const { deletedCount, message } =
      await this.userService.removeMultipleFromBlacklist(
        req.user.idx,
        dto.blocked_user_ids,
      );
    return ResponseWrapper.success({ deletedCount }, message);
  }

  @Get('profile/:nickname')
  @ApiOperation({ summary: '닉네임으로 사용자 프로필 조회' })
  @ApiParam({
    name: 'nickname',
    description: '조회할 사용자의 닉네임',
    example: 'user123',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 프로필 조회 성공',
    type: GetUserProfileResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '존재하지 않는 사용자입니다.',
    type: UserErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 오류',
    type: CustomInternalServerErrorResponse,
  })
  async getUserProfileByNickname(
    @Param('nickname') nickname: string,
  ): Promise<SuccessResponseDto<Record<string, unknown>>> {
    const profile = await this.userService.getUserProfileByNickname(nickname);
    return ResponseWrapper.success(
      { user: profile },
      '사용자 프로필을 조회했습니다.',
    );
  }
}
