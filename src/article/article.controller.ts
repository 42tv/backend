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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { ArticleService } from './article.service';
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';
import { GuestGuard } from 'src/auth/guard/jwt.guest.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
  ApiQuery,
  ApiParam,
  ApiOkResponse,
} from '@nestjs/swagger';
import {
  CustomBadRequestResponse,
  CustomInternalServerErrorResponse,
} from 'src/utils/utils';

@ApiTags('article')
@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Post()
  @UseGuards(MemberGuard)
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (_, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          cb(null, true);
        } else {
          cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
        }
      },
    }),
  )
  @ApiBearerAuth()
  @ApiOperation({
    summary: '게시글 작성',
    description:
      '새로운 게시글을 작성합니다. 최대 5개의 이미지 파일 업로드 가능.',
  })
  @ApiCreatedResponse({
    description: '게시글 작성 성공',
  })
  @ApiBadRequestResponse({
    description: '잘못된 요청',
    type: CustomBadRequestResponse,
  })
  @ApiInternalServerErrorResponse({
    description: '서버 오류',
    type: CustomInternalServerErrorResponse,
  })
  async createArticle(
    @Req() req: any,
    @Body() createArticleDto: { title: string; content: string },
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    const userIdx = req.user.idx;
    return await this.articleService.createArticle(
      userIdx,
      createArticleDto.title,
      createArticleDto.content,
      images,
    );
  }

  @Get(':id')
  @UseGuards(GuestGuard)
  @ApiOperation({
    summary: '게시글 상세 조회',
    description: '특정 게시글의 상세 정보를 조회합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '게시글 ID',
    type: 'number',
  })
  @ApiOkResponse({
    description: '게시글 조회 성공',
  })
  async getArticleById(
    @Param('id') id: string,
    @Query('view') incrementView?: string,
  ) {
    const articleId = parseInt(id);
    const shouldIncrementView = incrementView === 'true';
    return await this.articleService.getArticleById(
      articleId,
      shouldIncrementView,
    );
  }

  @Get('author/:authorId')
  @UseGuards(GuestGuard)
  @ApiOperation({
    summary: '작성자별 게시글 목록 조회',
    description: '특정 작성자의 게시글 목록을 조회합니다.',
  })
  @ApiParam({
    name: 'authorId',
    description: '작성자 ID',
    type: 'number',
  })
  @ApiQuery({
    name: 'page',
    description: '페이지 번호',
    type: 'number',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: '페이지당 항목 수',
    type: 'number',
    required: false,
  })
  @ApiOkResponse({
    description: '게시글 목록 조회 성공',
  })
  async getArticlesByAuthor(
    @Param('authorId') authorId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const authorIdx = parseInt(authorId);
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 20;
    return await this.articleService.getArticlesByAuthor(
      authorIdx,
      pageNum,
      limitNum,
    );
  }

  @Put(':id')
  @UseGuards(MemberGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '게시글 수정',
    description: '게시글을 수정합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '게시글 ID',
    type: 'number',
  })
  @ApiOkResponse({
    description: '게시글 수정 성공',
  })
  @ApiBadRequestResponse({
    description: '잘못된 요청',
    type: CustomBadRequestResponse,
  })
  async updateArticle(
    @Param('id') id: string,
    @Req() req: any,
    @Body() updateArticleDto: any,
  ) {
    const articleId = parseInt(id);
    const userIdx = req.user.idx;
    return await this.articleService.updateArticle(
      articleId,
      userIdx,
      updateArticleDto,
    );
  }

  @Delete(':id')
  @UseGuards(MemberGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '게시글 삭제',
    description: '게시글을 삭제합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '게시글 ID',
    type: 'number',
  })
  @ApiOkResponse({
    description: '게시글 삭제 성공',
  })
  async deleteArticle(@Param('id') id: string, @Req() req: any) {
    const articleId = parseInt(id);
    const userIdx = req.user.idx;
    return await this.articleService.deleteArticle(articleId, userIdx);
  }
}
