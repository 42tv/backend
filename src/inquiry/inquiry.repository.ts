import { Injectable } from '@nestjs/common';
import { InquiryStatus, InquiryType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class InquiryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userIdx: number,
    data: { type: InquiryType; title: string; content: string },
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.inquiry.create({
      data: {
        user_idx: userIdx,
        type: data.type,
        title: data.title,
        content: data.content,
      },
    });
  }

  async createImages(
    inquiryId: number,
    imageUrls: string[],
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.inquiryImage.createMany({
      data: imageUrls.map((url, index) => ({
        inquiry_id: inquiryId,
        image_url: url,
        image_order: index,
      })),
    });
  }

  async findByUser(
    userIdx: number,
    options: { limit: number; offset: number },
  ) {
    const [items, total] = await Promise.all([
      this.prisma.inquiry.findMany({
        where: { user_idx: userIdx },
        include: {
          images: { orderBy: { image_order: 'asc' } },
        },
        orderBy: { created_at: 'desc' },
        take: options.limit,
        skip: options.offset,
      }),
      this.prisma.inquiry.count({ where: { user_idx: userIdx } }),
    ]);
    return { items, total };
  }

  async findById(id: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.inquiry.findUnique({
      where: { id },
      include: {
        images: { orderBy: { image_order: 'asc' } },
        user: {
          select: { idx: true, user_id: true, nickname: true },
        },
        answerer: {
          select: { idx: true, user_id: true, nickname: true },
        },
      },
    });
  }

  async findAllForAdmin(options: {
    status?: InquiryStatus;
    type?: InquiryType;
    limit: number;
    offset: number;
  }) {
    const where: Prisma.InquiryWhereInput = {
      ...(options.status !== undefined && { status: options.status }),
      ...(options.type !== undefined && { type: options.type }),
    };

    const [items, total] = await Promise.all([
      this.prisma.inquiry.findMany({
        where,
        include: {
          images: { orderBy: { image_order: 'asc' } },
          user: {
            select: { idx: true, user_id: true, nickname: true },
          },
          answerer: {
            select: { idx: true, user_id: true, nickname: true },
          },
        },
        orderBy: { created_at: 'desc' },
        take: options.limit,
        skip: options.offset,
      }),
      this.prisma.inquiry.count({ where }),
    ]);
    return { items, total };
  }

  async countUnread(userIdx: number): Promise<number> {
    return await this.prisma.inquiry.count({
      where: {
        user_idx: userIdx,
        status: InquiryStatus.ANSWERED,
        is_answer_read: false,
      },
    });
  }

  async markAnswerRead(id: number) {
    return await this.prisma.inquiry.update({
      where: { id },
      data: { is_answer_read: true },
    });
  }

  async answer(id: number, adminIdx: number, answer: string) {
    return await this.prisma.inquiry.update({
      where: { id },
      data: {
        answer,
        answered_by: adminIdx,
        answered_at: new Date(),
        status: InquiryStatus.ANSWERED,
        is_answer_read: false,
      },
    });
  }

  async executeTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return await this.prisma.$transaction(callback);
  }
}
