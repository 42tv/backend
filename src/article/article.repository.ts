import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ArticleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createArticle(
    authorIdx: number,
    title: string,
    content: string,
    imageUrls?: string[],
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.article.create({
      data: {
        author_idx: authorIdx,
        title,
        content,
        images: imageUrls?.length
          ? {
              create: imageUrls.map((url, index) => ({
                image_url: url,
                image_order: index,
              })),
            }
          : undefined,
      },
      include: {
        author: {
          select: {
            idx: true,
            nickname: true,
            profile_img: true,
          },
        },
        images: {
          orderBy: {
            image_order: 'asc',
          },
        },
      },
    });
  }

  async getArticles(
    userIdx: number,
    offset = 0,
    limit = 10,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    const articles = await prismaClient.article.findMany({
      where: {
        author_idx: userIdx,
      },
      select: {
        id: true,
        author_idx: true,
        content: true,
        title: true,
        created_at: true,
        images: {
          select: {
            id: true,
            image_url: true,
            image_order: true,
          },
          orderBy: {
            image_order: 'asc',
          },
        },
      },
      orderBy: [{ is_pinned: 'desc' }, { created_at: 'desc' }],
      skip: offset,
      take: limit,
    });

    return articles.map((article) => ({
      id: article.id,
      authorIdx: article.author_idx,
      content: article.content,
      title: article.title,
      createdAt: article.created_at,
      images: article.images.map((image) => ({
        id: image.id,
        imageUrl: image.image_url,
        imageOrder: image.image_order,
      })),
    }));
  }

  async getArticleById(id: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.article.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            idx: true,
            nickname: true,
            profile_img: true,
          },
        },
        images: {
          orderBy: {
            image_order: 'asc',
          },
        },
      },
    });
  }

  async getArticlesByAuthor(
    authorIdx: number,
    skip?: number,
    take?: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.article.findMany({
      where: {
        author_idx: authorIdx,
      },
      include: {
        author: {
          select: {
            idx: true,
            nickname: true,
            profile_img: true,
          },
        },
        images: {
          orderBy: {
            image_order: 'asc',
          },
        },
      },
      orderBy: [{ is_pinned: 'desc' }, { created_at: 'desc' }],
      skip,
      take,
    });
  }

  async updateArticle(
    id: number,
    authorIdx: number,
    data: {
      title?: string;
      content?: string;
      is_pinned?: boolean;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.article.update({
      where: {
        id,
        author_idx: authorIdx,
      },
      data,
      include: {
        author: {
          select: {
            idx: true,
            nickname: true,
            profile_img: true,
          },
        },
        images: {
          orderBy: {
            image_order: 'asc',
          },
        },
      },
    });
  }

  async deleteArticle(
    id: number,
    authorIdx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.article.delete({
      where: {
        id,
        author_idx: authorIdx,
      },
    });
  }

  async getArticlesCount(
    userIdx: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.article.count({
      where: {
        author_idx: userIdx,
      },
    });
  }

  async incrementViewCount(id: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.article.update({
      where: { id },
      data: {
        view_count: {
          increment: 1,
        },
      },
    });
  }

  async createArticleImage(
    articleId: number,
    imageUrl: string,
    imageOrder: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.articleImage.create({
      data: {
        article_id: articleId,
        image_url: imageUrl,
        image_order: imageOrder,
      },
    });
  }

  async deleteArticleImages(
    articleId: number,
    imageOrder?: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.articleImage.deleteMany({
      where: {
        article_id: articleId,
        ...(imageOrder !== undefined && { image_order: imageOrder }),
      },
    });
  }

  async executeTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return await this.prisma.$transaction(callback);
  }
}
