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

  @Get()
  @UseGuards(GuestGuard)
  async getArticles(
    @Query('userIdx') userIdx: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    const userIdxNum = parseInt(userIdx);
    const offsetNum = offset ? parseInt(offset) : 0;
    const limitNum = limit ? parseInt(limit) : 10;
    return await this.articleService.getArticles(
      userIdxNum,
      offsetNum,
      limitNum,
    );
  }

  @Put(':id')
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
  async updateArticle(
    @Param('id') id: string,
    @Req() req: any,
    @Body()
    updateArticleDto: { title?: string; content?: string; keepImages?: string },
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    const articleId = parseInt(id);
    const userIdx = req.user.idx;
    const keepImageIds = updateArticleDto.keepImages
      ? updateArticleDto.keepImages
          .split(',')
          .map((id) => parseInt(id.trim()))
          .filter((id) => !isNaN(id))
      : [];

    return await this.articleService.updateArticle(
      articleId,
      userIdx,
      {
        title: updateArticleDto.title,
        content: updateArticleDto.content,
      },
      images,
      keepImageIds,
    );
  }

  @Delete(':id')
  @UseGuards(MemberGuard)
  async deleteArticle(@Param('id') id: string, @Req() req: any) {
    const articleId = parseInt(id);
    const userIdx = req.user.idx;
    return await this.articleService.deleteArticle(articleId, userIdx);
  }
}
