import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PostService } from './post.service';
import { PostDto } from './dto/create.post.dto';
import { DeletePostsDto } from './dto/delete-posts.dto';
import { UpdatePostSettingsDto } from './dto/update-post-settings.dto';
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import {
  CustomBadRequestResponse,
  CustomInternalServerErrorResponse,
} from 'src/utils/utils';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import {
  GetPostsResponseDto,
  PostCreateResponseDto,
  PostReadResponseDto,
  PostDeleteResponseDto,
  GetBlockedUsersResponseDto,
  PostBlockResponseDto,
  PostUnBlockResponseDto,
  GetPostSettingsResponseDto,
  UpdatePostSettingsResponseDto,
  PostErrorResponseDto,
} from './dto/post-response.dto';

@ApiTags('post')
@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get()
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '쪽지 리스트 가져오기' })
  @ApiQuery({
    name: 'kind',
    required: false,
    description: '쪽지 종류 (sent, received)',
    example: 'received',
  })
  @ApiQuery({
    name: 'nickname',
    required: false,
    description: '닉네임으로 필터링',
    example: 'user123',
  })
  @ApiCreatedResponse({
    description: '쪽지 리스트',
    type: GetPostsResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBearerAuth()
  async getPosts(
    @Req() req,
    @Query('kind') kind: string,
    @Query('nickname') nickname?: string,
  ): Promise<SuccessResponseDto<any[]>> {
    const posts = await this.postService.getPosts(req.user.idx, kind, nickname);
    return ResponseWrapper.success(posts, '쪽지 목록을 조회했습니다.');
  }

  @Post()
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '쪽지 쓰기' })
  @ApiBody({ type: PostDto })
  @ApiCreatedResponse({
    description: '변경 성공',
    type: PostCreateResponseDto,
  })
  @ApiBadRequestResponse({
    description: '적절한 에러 안내 메세지',
    type: CustomBadRequestResponse,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBearerAuth()
  async createPost(
    @Req() req,
    @Body() postDto: PostDto,
  ): Promise<SuccessResponseDto<null>> {
    await this.postService.createPost(req.user.idx, postDto);
    return ResponseWrapper.success(null, '쪽지를 성공적으로 보냈습니다.');
  }

  @Put(':postId')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '쪽지 읽기' })
  @ApiParam({
    name: 'postId',
    type: 'string',
    description: '읽을 쪽지의 ID',
  })
  @ApiCreatedResponse({
    description: '읽기 성공',
    type: PostReadResponseDto,
  })
  @ApiBadRequestResponse({
    description: '적절한 에러 안내 메세지',
    type: CustomBadRequestResponse,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBearerAuth()
  async readPosts(
    @Req() req,
    @Param('postId') postId: string,
  ): Promise<SuccessResponseDto<null>> {
    await this.postService.readPosts(req.user.idx, postId);
    return ResponseWrapper.success(null, '쪽지를 읽었습니다.');
  }

  @Delete()
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '쪽지 일괄 삭제' })
  @ApiBody({ type: DeletePostsDto })
  @ApiCreatedResponse({
    description: '삭제 성공',
    type: PostDeleteResponseDto,
  })
  @ApiBadRequestResponse({
    description: '적절한 에러 안내 메세지',
    type: CustomBadRequestResponse,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBearerAuth()
  async deletePosts(
    @Req() req,
    @Body() deletePostsDto: DeletePostsDto,
  ): Promise<SuccessResponseDto<null>> {
    if (deletePostsDto.type === 'sent') {
      await this.postService.deleteSentPosts(
        req.user.idx,
        deletePostsDto.postIds,
      );
    } else {
      await this.postService.deleteReceivedPosts(
        req.user.idx,
        deletePostsDto.postIds,
      );
    }
    return ResponseWrapper.success(null, '쪽지를 삭제했습니다.');
  }

  @Delete(':postId')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '쪽지 개별 삭제' })
  @ApiParam({
    name: 'postId',
    type: 'string',
    description: '삭제할 쪽지의 ID',
  })
  @ApiQuery({
    name: 'type',
    required: true,
    enum: ['sent', 'received'],
    description: '삭제할 쪽지 타입 (sent: 보낸쪽지, received: 받은쪽지)',
    example: 'received',
  })
  @ApiCreatedResponse({
    description: '삭제 성공',
    type: PostDeleteResponseDto,
  })
  @ApiBadRequestResponse({
    description: '적절한 에러 안내 메세지',
    type: CustomBadRequestResponse,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBearerAuth()
  async deletePost(
    @Req() req,
    @Param('postId') postId,
    @Query('type') type: 'sent' | 'received',
  ): Promise<SuccessResponseDto<null>> {
    if (type === 'sent') {
      await this.postService.deleteSentPost(req.user.idx, postId);
    } else {
      await this.postService.deleteReceivedPost(req.user.idx, postId);
    }
    return ResponseWrapper.success(null, '쪽지를 삭제했습니다.');
  }

  @Get('block/user')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '차단된 유저 리스트 가져오기' })
  @ApiCreatedResponse({
    description: '차단된 유저 리스트',
    type: GetBlockedUsersResponseDto,
  })
  @ApiBadRequestResponse({
    description: '적절한 에러 안내 메세지',
    type: PostErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBearerAuth()
  async getBlockedPostUser(@Req() req): Promise<SuccessResponseDto<any[]>> {
    const blockedUsers = await this.postService.getBlockedPostUser(
      req.user.idx,
    );
    return ResponseWrapper.success(
      blockedUsers,
      '차단된 유저 목록을 조회했습니다.',
    );
  }

  @Post('block/user/:blockedUserIdx')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '쪽지 차단 유저' })
  @ApiParam({
    name: 'blockedUserIdx',
    type: 'number',
    description: '차단할 사용자의 idx',
  })
  @ApiCreatedResponse({
    description: '차단 성공',
    type: PostBlockResponseDto,
  })
  @ApiBadRequestResponse({
    description: '적절한 에러 안내 메세지',
    type: PostErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBearerAuth()
  async blockUser(
    @Req() req,
    @Param('blockedUserIdx') blockedUserIdx: number,
  ): Promise<SuccessResponseDto<null>> {
    await this.postService.blockUser(req.user.idx, blockedUserIdx);
    return ResponseWrapper.success(null, '유저를 차단했습니다.');
  }

  @Delete('block/user')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '쪽지 차단 일괄 해제' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['blockedUserIdxs'],
      properties: {
        blockedUserIdxs: {
          type: 'array',
          items: { type: 'number' },
          description: '차단 해제할 사용자 idx 배열',
          example: [1, 2, 3],
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: '차단 해제 성공',
    type: PostUnBlockResponseDto,
  })
  @ApiBadRequestResponse({
    description: '적절한 에러 안내 메세지',
    type: PostErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBearerAuth()
  async unblockUsers(
    @Req() req,
    @Body('blockedUserIdxs') blockedUserIdxs: number[],
  ): Promise<SuccessResponseDto<null>> {
    console.log(blockedUserIdxs);
    await this.postService.unblockUsers(req.user.idx, blockedUserIdxs);
    return ResponseWrapper.success(null, '유저를 차단 해제했습니다.');
  }

  @Delete('block/user/:blockedUserIdx')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '쪽지 차단 개별 해제' })
  @ApiParam({
    name: 'blockedUserIdx',
    type: 'number',
    description: '차단 해제할 사용자의 idx',
  })
  @ApiCreatedResponse({
    description: '차단 해제 성공',
    type: PostUnBlockResponseDto,
  })
  @ApiBadRequestResponse({
    description: '적절한 에러 안내 메세지',
    type: PostErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBearerAuth()
  async unblockUser(
    @Req() req,
    @Param('blockedUserIdx') blockedUserIdx: number,
  ): Promise<SuccessResponseDto<null>> {
    await this.postService.unblockUser(req.user.idx, blockedUserIdx);
    return ResponseWrapper.success(null, '유저를 차단 해제했습니다.');
  }

  @Get('setting')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '쪽지 설정 조회' })
  @ApiCreatedResponse({
    description: '쪽지 설정 조회 성공',
    type: GetPostSettingsResponseDto,
  })
  @ApiBadRequestResponse({
    description: '적절한 에러 안내 메세지',
    type: CustomBadRequestResponse,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBearerAuth()
  async getPostSettings(
    @Req() req,
  ): Promise<SuccessResponseDto<Record<string, unknown>>> {
    const settings = await this.postService.getPostSettings(req.user.idx);
    return ResponseWrapper.success(settings, '쪽지 설정을 조회했습니다.');
  }

  @Put('/setting/level')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '쪽지 설정 업데이트' })
  @ApiBody({ type: UpdatePostSettingsDto })
  @ApiCreatedResponse({
    description: '쪽지 설정 업데이트 성공',
    type: UpdatePostSettingsResponseDto,
  })
  @ApiBadRequestResponse({
    description: '적절한 에러 안내 메세지',
    type: CustomBadRequestResponse,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBearerAuth()
  async updatePostSettings(
    @Req() req,
    @Body() updateData: UpdatePostSettingsDto,
  ): Promise<SuccessResponseDto<null>> {
    console.log(updateData);
    const { message } = await this.postService.updatePostSettings(
      req.user.idx,
      updateData.minFanLevel,
    );
    return ResponseWrapper.success(null, message);
  }
}
