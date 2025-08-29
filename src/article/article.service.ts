import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ArticleRepository } from './article.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { AwsService } from 'src/aws/aws.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class ArticleService {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly prismaService: PrismaService,
    private readonly awsService: AwsService,
    private readonly userService: UserService,
  ) {}

  async createArticle(
    authorIdx: number,
    title: string,
    content: string,
    images?: Express.Multer.File[],
  ) {
    if (!title.trim()) {
      throw new BadRequestException('제목을 입력해주세요.');
    }

    if (!content.trim()) {
      throw new BadRequestException('내용을 입력해주세요.');
    }

    // 사용자 정보 조회 (user_id 필요) - MemberGuard에서 이미 검증됨
    const user = await this.userService.findByUserIdx(authorIdx);

    // 트랜잭션으로 게시글 생성
    await this.prismaService.$transaction(async (tx) => {
      // 먼저 게시글 생성 (이미지 없이)
      const article = await this.articleRepository.createArticle(
        authorIdx,
        title.trim(),
        content.trim(),
        undefined,
        tx,
      );

      // 이미지가 있는 경우 S3에 업로드
      if (images && images.length > 0) {
        const imageUrls: string[] = [];

        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          const s3Key = `article/${user.user_id}/${article.id}/${i}.jpg`;

          // S3에 업로드
          await this.awsService.uploadToS3(s3Key, image.buffer, image.mimetype);

          // CDN URL 생성
          const imageUrl = `${process.env.CDN_URL}/${s3Key}`;
          imageUrls.push(imageUrl);

          // 이미지 정보 DB에 저장
          await tx.articleImage.create({
            data: {
              article_id: article.id,
              image_url: imageUrl,
              image_order: i,
            },
          });
        }

        // 이미지가 포함된 게시글 정보 다시 조회
        return await this.articleRepository.getArticleById(article.id, tx);
      }
      return article;
    });
    return {
      code: 200,
      message: '게시글이 성공적으로 생성되었습니다.',
    };
  }

  async getArticles(userIdx: number, offset = 0, limit = 10) {
    return await this.articleRepository.getArticles(userIdx, offset, limit);
  }

  async getArticleById(id: number, incrementView = false) {
    const article = await this.articleRepository.getArticleById(id);

    if (!article || !article.is_active) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    if (incrementView) {
      await this.articleRepository.incrementViewCount(id);
      article.view_count += 1;
    }

    return article;
  }

  async getArticlesByAuthor(authorIdx: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return await this.articleRepository.getArticlesByAuthor(
      authorIdx,
      skip,
      limit,
    );
  }

  async updateArticle(
    id: number,
    authorIdx: number,
    data: {
      title?: string;
      content?: string;
      is_pinned?: boolean;
    },
  ) {
    const existingArticle = await this.articleRepository.getArticleById(id);

    if (!existingArticle || !existingArticle.is_active) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    if (existingArticle.author_idx !== authorIdx) {
      throw new ForbiddenException('게시글을 수정할 권한이 없습니다.');
    }

    if (data.title && !data.title.trim()) {
      throw new BadRequestException('제목을 입력해주세요.');
    }

    if (data.content && !data.content.trim()) {
      throw new BadRequestException('내용을 입력해주세요.');
    }

    const updateData = {
      ...data,
      title: data.title?.trim(),
      content: data.content?.trim(),
    };

    return await this.articleRepository.updateArticle(
      id,
      authorIdx,
      updateData,
    );
  }

  async deleteArticle(id: number, authorIdx: number) {
    const existingArticle = await this.articleRepository.getArticleById(id);

    if (!existingArticle || !existingArticle.is_active) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    if (existingArticle.author_idx !== authorIdx) {
      throw new ForbiddenException('게시글을 삭제할 권한이 없습니다.');
    }

    // 이미지가 있는 경우 S3에서도 삭제
    if (existingArticle.images && existingArticle.images.length > 0) {
      const user = await this.userService.findByUserIdx(authorIdx);
      if (user) {
        // 각 이미지를 S3에서 삭제
        for (let i = 0; i < existingArticle.images.length; i++) {
          const s3Key = `article/${user.user_id}/${id}/${i}.jpg`;
          try {
            await this.awsService.deleteFromS3(s3Key);
          } catch (error) {
            console.log(`S3에서 이미지 삭제 실패: ${s3Key}`, error);
            // S3 삭제 실패해도 게시글 삭제는 진행
          }
        }
      }
    }

    return await this.articleRepository.deleteArticle(id, authorIdx);
  }
}
