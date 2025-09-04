import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ArticleRepository } from './article.repository';
import { AwsService } from 'src/aws/aws.service';
import { UserService } from 'src/user/user.service';
import * as sharp from 'sharp';

@Injectable()
export class ArticleService {
  constructor(
    private readonly articleRepository: ArticleRepository,
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

    // 사용자 정보 조회 (user_id 필요)
    const user = await this.userService.findByUserIdx(authorIdx);

    // 트랜잭션으로 게시글 생성
    await this.articleRepository.executeTransaction(async (tx) => {
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
        for (let i = 0; i < images.length; i++) {
          await this.uploadImageToS3AndSaveDB(
            images[i],
            user.user_id,
            article.id,
            i,
            tx,
          );
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

  async getArticlesWithPagination(
    userId: string,
    page?: number,
    offset?: number,
    limit = 5,
  ) {
    // userId로 사용자 정보 조회
    const user = await this.userService.findByUserId(userId);
    if (!user) {
      // 사용자를 찾지 못한 경우 빈 데이터 반환
      return {
        data: [],
        pagination: {
          total: 0,
          currentPage: page || 1,
          totalPages: 0,
          limit,
          offset: offset || 0,
          hasNext: false,
          hasPrev: false,
          nextOffset: null,
          prevOffset: null,
        },
      };
    }

    const userIdx = user.idx;
    // page가 주어진 경우 offset 계산
    const actualOffset = page ? (page - 1) * limit : offset || 0;
    const actualPage = page || Math.floor(actualOffset / limit) + 1;

    // 병렬로 데이터와 전체 개수 조회
    const [articles, total] = await Promise.all([
      this.articleRepository.getArticles(userIdx, actualOffset, limit),
      this.articleRepository.getArticlesCount(userIdx),
    ]);

    // 페이지네이션 메타데이터 계산
    const totalPages = Math.ceil(total / limit);
    const hasNext = actualOffset + limit < total;
    const hasPrev = actualOffset > 0;
    const nextOffset = hasNext ? actualOffset + limit : null;
    const prevOffset = hasPrev ? Math.max(0, actualOffset - limit) : null;

    return {
      data: articles,
      pagination: {
        total,
        currentPage: actualPage,
        totalPages,
        limit,
        offset: actualOffset,
        hasNext,
        hasPrev,
        nextOffset,
        prevOffset,
      },
    };
  }

  async getArticlesByAuthor(authorIdx: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return await this.articleRepository.getArticlesByAuthor(
      authorIdx,
      skip,
      limit,
    );
  }

  private async validateArticlePermission(id: number, authorIdx: number) {
    const article = await this.articleRepository.getArticleById(id);
    if (!article) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
    if (article.author_idx !== authorIdx) {
      throw new ForbiddenException('게시글을 수정할 권한이 없습니다.');
    }
    return article;
  }

  private async reorderImages(keepImageIds: number[]) {
    // 유지할 이미지들을 새로운 순서로 재배치
    const reorderedImages = keepImageIds.map((id, index) => ({
      id,
      newOrder: index,
    }));

    // 새 이미지들의 시작 순서
    const newImageStartOrder = keepImageIds.length;

    return { reorderedImages, newImageStartOrder };
  }

  private async processImageUpdates(
    existingArticle: any,
    keepImageIds: number[] | undefined,
    newImages: Express.Multer.File[] | undefined,
    userId: string,
    articleId: number,
    tx: any,
  ) {
    const existingImages = existingArticle.images || [];
    const keepIds = keepImageIds || [];

    // 1. 이미지 순서 계산
    const { reorderedImages, newImageStartOrder } =
      await this.reorderImages(keepIds);

    // 2. 삭제할 이미지들 찾기
    const imagesToDelete = existingImages.filter(
      (img) => !keepIds.includes(img.id),
    );

    // 3. 삭제할 이미지들 S3에서 제거
    if (imagesToDelete.length > 0) {
      for (const imageToDelete of imagesToDelete) {
        await this.deleteImageFromS3AndDB(
          userId,
          articleId,
          imageToDelete.image_order,
          tx,
        );
      }
    }

    // 5. DB에서 모든 기존 이미지 삭제
    await this.articleRepository.deleteArticleImages(articleId, undefined, tx);

    // 6. 유지할 이미지들 새 순서로 재삽입
    for (const reorderedImg of reorderedImages) {
      const originalImg = existingImages.find(
        (img) => img.id === reorderedImg.id,
      );
      if (originalImg) {
        await this.articleRepository.createArticleImage(
          articleId,
          originalImg.image_url,
          reorderedImg.newOrder,
          tx,
        );
      }
    }

    // 7. 새 이미지들 업로드 및 DB 저장
    if (newImages && newImages.length > 0) {
      for (let i = 0; i < newImages.length; i++) {
        await this.uploadImageToS3AndSaveDB(
          newImages[i],
          userId,
          articleId,
          newImageStartOrder + i,
          tx,
        );
      }
    }
  }

  private async uploadImageToS3AndSaveDB(
    image: Express.Multer.File,
    userId: string,
    articleId: number,
    imageOrder: number,
    tx?: any,
  ): Promise<string> {
    const s3Key = `article/${userId}/${articleId}/${imageOrder}.jpg`;

    // 이미지 리사이징
    const resizedBuffer = await sharp(image.buffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // S3에 업로드
    await this.awsService.uploadToS3(s3Key, resizedBuffer, 'image/jpeg');

    // CDN URL 생성
    const imageUrl = `${process.env.CDN_URL}/${s3Key}`;

    // DB에 이미지 정보 저장
    await this.articleRepository.createArticleImage(
      articleId,
      imageUrl,
      imageOrder,
      tx,
    );

    return imageUrl;
  }

  private async deleteImageFromS3AndDB(
    userId: string,
    articleId: number,
    imageOrder: number,
    tx?: any,
  ): Promise<void> {
    const s3Key = `article/${userId}/${articleId}/${imageOrder}.jpg`;

    // S3에서 이미지 삭제
    try {
      await this.awsService.deleteFromS3(s3Key);
    } catch (error) {
      console.log(`S3에서 이미지 삭제 실패: ${s3Key}`, error);
    }

    // DB에서 이미지 정보 삭제
    await this.articleRepository.deleteArticleImages(articleId, imageOrder, tx);
  }

  async updateArticle(
    id: number,
    authorIdx: number,
    data: {
      title?: string;
      content?: string;
      keepImageIds?: number[];
    },
    newImages?: Express.Multer.File[],
  ) {
    const existingArticle = await this.validateArticlePermission(id, authorIdx);
    const user = await this.userService.findByUserIdx(authorIdx);

    return await this.articleRepository.executeTransaction(async (tx) => {
      // 1. 이미지 처리 먼저 (S3 업로드 및 DB 저장)
      if (newImages || data.keepImageIds) {
        await this.processImageUpdates(
          existingArticle,
          data.keepImageIds,
          newImages,
          user.user_id,
          id,
          tx,
        );
      }

      // 2. 기본 정보 업데이트 (이미지 처리 완료 후)
      const updateData: { title?: string; content?: string } = {};
      if (data.title !== undefined) {
        updateData.title = data.title ? data.title.trim() : '';
      }
      if (data.content !== undefined) {
        updateData.content = data.content ? data.content.trim() : '';
      }

      // 기본 정보만 업데이트하는 경우에도 실행
      if (Object.keys(updateData).length > 0) {
        await this.articleRepository.updateArticle(
          id,
          authorIdx,
          updateData,
          tx,
        );
      }

      // 3. 최종 업데이트된 게시글 정보 반환 (이미지 포함)
      return await this.articleRepository.getArticleById(id, tx);
    });
  }

  async deleteArticle(id: number, authorIdx: number) {
    const existingArticle = await this.validateArticlePermission(id, authorIdx);
    const user = await this.userService.findByUserIdx(authorIdx);

    return await this.articleRepository.executeTransaction(async (tx) => {
      // 이미지가 있는 경우 S3에서도 삭제
      if (existingArticle.images && existingArticle.images.length > 0) {
        // 각 이미지를 S3에서 삭제
        for (const image of existingArticle.images) {
          await this.deleteImageFromS3AndDB(
            user.user_id,
            id,
            image.image_order,
            tx,
          );
        }
      }

      // 게시글 완전 삭제
      return await this.articleRepository.deleteArticle(id, authorIdx, tx);
    });
  }
}
