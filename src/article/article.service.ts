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
import * as sharp from 'sharp';

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

          // 이미지 리사이징 (최대 800px, 원본 비율 유지)
          const resizedBuffer = await sharp(image.buffer)
            .resize(800, 800, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: 85 })
            .toBuffer();

          // S3에 리사이즈된 이미지 업로드
          await this.awsService.uploadToS3(s3Key, resizedBuffer, 'image/jpeg');

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
    },
    newImages?: Express.Multer.File[],
    keepImageIds?: number[],
  ) {
    const existingArticle = await this.getArticleById(id);

    if (existingArticle.author_idx !== authorIdx) {
      throw new ForbiddenException('게시글을 수정할 권한이 없습니다.');
    }

    if (data.title && !data.title.trim()) {
      throw new BadRequestException('제목을 입력해주세요.');
    }

    if (data.content && !data.content.trim()) {
      throw new BadRequestException('내용을 입력해주세요.');
    }

    const user = await this.userService.findByUserIdx(authorIdx);

    return await this.prismaService.$transaction(async (tx) => {
      // 1. 기본 정보 업데이트
      const updateData = {
        title: data.title?.trim(),
        content: data.content?.trim(),
      };

      await this.articleRepository.updateArticle(id, authorIdx, updateData, tx);

      // 2. 이미지 처리
      if (newImages || keepImageIds) {
        // 기존 이미지들 중 삭제할 이미지들 찾기
        const existingImages = existingArticle.images || [];
        const imagesToDelete = existingImages.filter(
          (img) => !keepImageIds?.includes(img.id),
        );

        // S3에서 삭제할 이미지들 제거
        for (const imageToDelete of imagesToDelete) {
          try {
            const s3Key = `article/${user.user_id}/${id}/${imageToDelete.image_order}.jpg`;
            await this.awsService.deleteFromS3(s3Key);
          } catch (error) {
            console.log(`S3에서 이미지 삭제 실패: ${error}`);
          }
        }

        // DB에서 삭제할 이미지들 제거
        if (imagesToDelete.length > 0) {
          await tx.articleImage.deleteMany({
            where: {
              id: { in: imagesToDelete.map((img) => img.id) },
            },
          });
        }

        // 새 이미지들 업로드
        if (newImages && newImages.length > 0) {
          const existingMaxOrder = Math.max(
            ...(keepImageIds || []).map((id) => {
              const img = existingImages.find((i) => i.id === id);
              return img ? img.image_order : -1;
            }),
            -1,
          );

          for (let i = 0; i < newImages.length; i++) {
            const image = newImages[i];
            const imageOrder = existingMaxOrder + 1 + i;
            const s3Key = `article/${user.user_id}/${id}/${imageOrder}.jpg`;

            // 이미지 리사이징
            const resizedBuffer = await sharp(image.buffer)
              .resize(800, 800, {
                fit: 'inside',
                withoutEnlargement: true,
              })
              .jpeg({ quality: 85 })
              .toBuffer();

            // S3에 업로드
            await this.awsService.uploadToS3(
              s3Key,
              resizedBuffer,
              'image/jpeg',
            );

            // DB에 저장
            const imageUrl = `${process.env.CDN_URL}/${s3Key}`;
            await tx.articleImage.create({
              data: {
                article_id: id,
                image_url: imageUrl,
                image_order: imageOrder,
              },
            });
          }
        }
      }

      // 3. 업데이트된 게시글 정보 반환
      return await this.articleRepository.getArticleById(id, tx);
    });
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
