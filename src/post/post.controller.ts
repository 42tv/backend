import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { PostService } from './post.service';
import { PostDto } from './dto/create.post.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiProperty,
} from '@nestjs/swagger';
import {
  CustomBadRequestResponse,
  CustomInternalServerErrorResponse,
} from 'src/utils/utils';

class PostResponse {
  @ApiProperty({
    example: '쪽지를 성공적으로 보냈습니다.',
    description: '성공 메시지',
  })
  message: string;
}

class PostsData {
  id: number;
  message: string;
  sender: {
    idx: number;
    userId: string;
    nickname: string;
  };
  recipient: {
    idx: number;
    userId: string;
    nickname: string;
  };
  sentAt: string;
  readAt: string;
}

class GetResponse {
  @ApiProperty({
    example: [
      [
        {
          id: 9,
          message: '대충 쪽지 내용1',
          sender: {
            idx: 5,
            userId: '3333',
            nickname: '3333',
          },
          recipient: {
            idx: 4,
            userId: '1234',
            nickname: '1234',
          },
          sentAt: '2025-03-10T15:12:33.468Z',
          readAt: '2025-03-10T15:12:33.468Z',
        },
        {
          id: 10,
          message: '대충 쪽지 내용12',
          sender: {
            idx: 5,
            userId: '3333',
            nickname: '3333',
          },
          recipient: {
            idx: 4,
            userId: '1234',
            nickname: '1234',
          },
          sentAt: '2025-03-10T15:12:35.952Z',
          readAt: null,
        },
        {
          id: 11,
          message: '대충 쪽지 내용123',
          sender: {
            idx: 5,
            userId: '3333',
            nickname: '3333',
          },
          recipient: {
            idx: 4,
            userId: '1234',
            nickname: '1234',
          },
          sentAt: '2025-03-10T15:12:37.378Z',
          readAt: null,
        },
        {
          id: 12,
          message: '대충 쪽지 내용1234',
          sender: {
            idx: 5,
            userId: '3333',
            nickname: '3333',
          },
          recipient: {
            idx: 4,
            userId: '1234',
            nickname: '1234',
          },
          sentAt: '2025-03-10T15:12:39.143Z',
          readAt: null,
        },
      ],
    ],
    description: 'post 내용',
  })
  posts: PostsData[];
}

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
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
  async getPosts(@Req() req) {
    return await this.postService.getPosts(req.user.idx);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '닉네임 변경' })
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
}
