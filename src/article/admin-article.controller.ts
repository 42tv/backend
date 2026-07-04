import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { ArticleRepository } from './article.repository';

class TogglePinnedDto {
  @IsBoolean()
  is_pinned: boolean;
}

class ToggleActiveDto {
  @IsBoolean()
  is_active: boolean;
}

@Controller('admin/articles')
@UseGuards(AdminGuard)
export class AdminArticleController {
  constructor(private readonly articleRepository: ArticleRepository) {}

  @Get()
  async getArticles(
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<SuccessResponseDto<{ articles: any[] }>> {
    const take = limit ? parseInt(limit, 10) : 20;
    const currentPage = page ? parseInt(page, 10) : 1;

    const { items, total } = await this.articleRepository.findAllAdmin({
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      limit: take,
      offset: (currentPage - 1) * take,
    });

    return ResponseWrapper.success(
      { articles: items },
      '게시글 목록을 조회했습니다.',
      {
        page: currentPage,
        limit: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    );
  }

  @Patch(':id/pinned')
  async togglePinned(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TogglePinnedDto,
  ): Promise<SuccessResponseDto<any>> {
    const article = await this.articleRepository.getArticleById(id);
    if (!article) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
    const updated = await this.articleRepository.updateFlags(id, {
      is_pinned: dto.is_pinned,
    });
    return ResponseWrapper.success(updated, '고정 상태를 변경했습니다.');
  }

  @Patch(':id/active')
  async toggleActive(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ToggleActiveDto,
  ): Promise<SuccessResponseDto<any>> {
    const article = await this.articleRepository.getArticleById(id);
    if (!article) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
    const updated = await this.articleRepository.updateFlags(id, {
      is_active: dto.is_active,
    });
    return ResponseWrapper.success(updated, '노출 상태를 변경했습니다.');
  }
}
