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
        is_active: true,
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
    return await prismaClient.article.update({
      where: {
        id,
        author_idx: authorIdx,
      },
      data: {
        is_active: false,
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
}
