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
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
} from '@nestjs/swagger';
import {
  CustomBadRequestResponse,
  CustomInternalServerErrorResponse,
} from 'src/utils/utils';
import {
  DeleteResponse,
  GetResponse,
  PostBlockBadRequestResponse,
  PostBlockResponse,
  PostResponse,
  PostUnBlockResponse,
  PutResponse,
} from './swagger.entity/swagger.entity';

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get()
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '쪽지 리스트 가져오기' })
  @ApiCreatedResponse({
    description: '쪽지 리스트',
    type: GetResponse,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBearerAuth()
  async getPosts(@Req() req, @Query('kind') kind, @Query('nickname') nickname) {
    return await this.postService.getPosts(req.user.idx, kind, nickname);
  }

  @Post()
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '쪽지 쓰기' })
  @ApiCreatedResponse({
    description: '변경 성공',
    type: PostResponse,
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
  async createPost(@Req() req, @Body() postDto: PostDto) {
    await this.postService.createPost(req.user.idx, postDto);
    return {
      message: '쪽지를 성공적으로 보냈습니다.',
    };
  }

  @Put(':postId')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '쪽지 읽기' })
  @ApiCreatedResponse({
    description: '읽기 성공',
    type: PutResponse,
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
  async readPosts(@Req() req, @Param('postId') postId) {
    await this.postService.readPosts(req.user.idx, postId);
    return {
      message: '쪽지를 읽었습니다.',
    };
  }

  @Delete()
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '쪽지 삭제' })
  @ApiCreatedResponse({
    description: '삭제 성공',
    type: DeleteResponse,
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
  async deletePosts(@Req() req, @Body('postIds') postIds) {
    await this.postService.deletePosts(req.user.idx, postIds);
    return {
      message: '쪽지를 삭제했습니다.',
    };
  }

  @Delete(':postId')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '쪽지 삭제' })
  @ApiCreatedResponse({
    description: '삭제 성공',
    type: DeleteResponse,
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
  async deletePost(@Req() req, @Param('postId') postId) {
    await this.postService.deletePost(req.user.idx, postId);
    return {
      message: '쪽지를 삭제했습니다.',
    };
  }

  @Get('block/user')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '차단된 유저 리스트 가져오기' })
  @ApiCreatedResponse({
    description: '차단된 유저 리스트',
    type: GetResponse, // 수정 요망
  })
  @ApiBadRequestResponse({
    description: '적절한 에러 안내 메세지',
    type: GetResponse, // 수정 요망
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBearerAuth()
  async getBlockedPostUser(@Req() req) {
    return await this.postService.getBlockedPostUser(req.user.idx);
  }

  @Post('block/user/:blockedUserIdx')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '쪽지 차단 유저' })
  @ApiCreatedResponse({
    description: '차단 성공',
    type: PostBlockResponse,
  })
  @ApiBadRequestResponse({
    description: '적절한 에러 안내 메세지',
    type: PostBlockBadRequestResponse,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBearerAuth()
  async blockUser(@Req() req, @Param('blockedUserIdx') blockedUserIdx) {
    await this.postService.blockUser(req.user.idx, blockedUserIdx);
    return {
      message: '유저를 차단했습니다.',
    };
  }

  @Delete('block/user')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '쪽지 차단 동시 해제' })
  @ApiCreatedResponse({
    description: '차단 해제 성공',
    type: PostUnBlockResponse,
  })
  @ApiBadRequestResponse({
    description: '적절한 에러 안내 메세지',
    type: PostBlockBadRequestResponse,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBearerAuth()
  async unblockUsers(@Req() req, @Body('blockedUserIdxs') blockedUserIdxs) {
    console.log(blockedUserIdxs);
    await this.postService.unblockUsers(req.user.idx, blockedUserIdxs);
    return {
      message: '유저를 차단 해제했습니다.',
    };
  }

  @Delete('block/user/:blockedUserIdx')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: '쪽지 차단 다수 해제' })
  @ApiCreatedResponse({
    description: '차단 다수 해제 성공',
    type: PostUnBlockResponse,
  })
  @ApiBadRequestResponse({
    description: '적절한 에러 안내 메세지',
    type: PostBlockBadRequestResponse,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 에러',
    type: CustomInternalServerErrorResponse,
  })
  @ApiBearerAuth()
  async unblockUser(
    @Req() req,
    @Param('blockedUserIdx') blockedUserIdx: number,
  ) {
    await this.postService.unblockUser(req.user.idx, blockedUserIdx);
    return {
      message: '유저를 차단 해제했습니다.',
    };
  }
}
