import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BookmarkRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 북마크 생성
   * @param bookmarker_idx 북마크를 추가하는 사용자 ID
   * @param bookmarked_idx 북마크 대상 사용자 ID
   * @param tx 트랜잭션 클라이언트
   * @returns 생성된 북마크
   */
  async createBookmark(
    bookmarker_idx: number,
    bookmarked_idx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.bookmark.create({
      data: {
        bookmarker_idx,
        bookmarked_idx,
      },
    });
  }

  /**
   * 북마크 삭제
   * @param bookmarker_idx 북마크를 삭제하는 사용자 ID
   * @param bookmarked_idx 북마크 대상 사용자 ID
   * @param tx 트랜잭션 클라이언트
   * @returns 삭제된 북마크
   */
  async deleteBookmark(
    bookmarker_idx: number,
    bookmarked_idx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.bookmark.deleteMany({
      where: {
        bookmarker_idx,
        bookmarked_idx,
      },
    });
  }

  /**
   * 북마크 여부 확인
   * @param bookmarker_idx 북마크를 한 사용자 ID
   * @param bookmarked_idx 북마크 대상 사용자 ID
   * @param tx 트랜잭션 클라이언트
   * @returns 북마크 객체 또는 null
   */
  async findBookmark(
    bookmarker_idx: number,
    bookmarked_idx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.bookmark.findFirst({
      where: {
        bookmarker_idx,
        bookmarked_idx,
      },
    });
  }

  /**
   * 사용자의 모든 북마크 조회
   * @param bookmarker_idx 북마크를 한 사용자 ID
   * @param tx 트랜잭션 클라이언트
   * @returns 북마크 목록
   */
  async findAllBookmarks(
    bookmarker_idx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.bookmark.findMany({
      where: {
        bookmarker_idx,
      },
      include: {
        bookmarked: true,
      },
    });
  }

  /**
   * 특정 사용자가 받은 북마크 수 조회
   * @param bookmarked_idx 북마크된 사용자 ID
   * @param tx 트랜잭션 클라이언트
   * @returns 북마크 수
   */
  async countBookmarkedBy(
    bookmarked_idx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.bookmark.count({
      where: {
        bookmarked_idx,
      },
    });
  }

  /**
   * 북마크 여러개 삭제
   * @param user_idx
   * @param deleted_idx
   * @param tx
   * @returns
   */
  async deleteBookmarks(
    user_idx: number,
    deleted_idx: number[],
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.bookmark.deleteMany({
      where: {
        bookmarker_idx: user_idx,
        id: {
          in: deleted_idx,
        },
      },
    });
  }
}
