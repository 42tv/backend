import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PostRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 쪽지 생성
   * @param sender_idx
   * @param receiver_idx
   * @param message
   * @param tx
   * @returns
   */
  async createPost(
    sender_idx: number,
    receiver_idx: number,
    message: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.posts.create({
      data: {
        content: message,
        sender: {
          connect: {
            idx: sender_idx,
          },
        },
        recipient: {
          connect: {
            idx: receiver_idx,
          },
        },
      },
    });
  }

  /**
   * 쪽지 리스트 가져오기
   * @param recipient_idx
   * @returns
   */
  async getPosts(recipient_idx: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.posts.findMany({
      where: {
        recipient_idx: recipient_idx,
      },
      orderBy: {
        sent_at: 'desc',
      },
      take: 100,
    });
  }

  /**
   * 보낸 닉네임이 일치하는 쪽지리스트 가져오기
   * @param recipient_idx
   * @param nickname
   * @param tx
   * @returns
   */
  async getReceivePostsByNickname(
    recipient_idx: number,
    nickname: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.posts.findMany({
      where: {
        recipient_idx: recipient_idx,
        sender: {
          nickname: nickname,
        },
      },
      orderBy: {
        sent_at: 'desc',
      },
      take: 100,
    });
  }

  /**
   * 보낸 쪽지 가져오기
   * @param sender_idx
   * @param tx
   * @returns
   */
  async getSendPosts(sender_idx: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.posts.findMany({
      where: {
        sender_idx: sender_idx,
      },
      orderBy: {
        sent_at: 'desc',
      },
      take: 100,
    });
  }

  /**
   * 보낸 쪽지 닉네임 검색
   * @param sender_idx
   * @param nickname
   * @param tx
   * @returns
   */
  async getSendPostsByNickname(
    sender_idx: number,
    nickname: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.posts.findMany({
      where: {
        sender_idx: sender_idx,
        recipient: {
          nickname: nickname,
        },
      },
      orderBy: {
        sent_at: 'desc',
      },
      take: 100,
    });
  }

  /**
   * 쪽지 읽기
   * @param recipient_idx
   * @param postId
   * @param tx
   * @returns
   */
  async readPosts(
    recipient_idx: number,
    postId: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.posts.update({
      where: {
        recipient_idx: recipient_idx,
        id: postId,
      },
      data: {
        is_read: true,
        read_at: new Date(new Date().getTime() + 9 * 60 * 60 * 1000), // Korean time (UTC+9)
      },
    });
  }

  /**
   * 쪽지 삭제
   * @param recipient_idx
   * @param postId
   * @param tx
   * @returns
   */
  async deletePost(
    recipient_idx: number,
    postId: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.posts.delete({
      where: {
        recipient_idx: recipient_idx,
        id: postId,
      },
    });
  }

  /**
   * 쪽지 여러개 삭제
   * @param recipient_idx
   * @param postIds
   * @param tx
   * @returns
   */
  async deletePosts(
    recipient_idx: number,
    postIds: number[],
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.posts.deleteMany({
      where: {
        recipient_idx: recipient_idx,
        id: {
          in: postIds,
        },
      },
    });
  }

  /**
   * blocker_idx가 blocked_idx를 차단했는지 확인하는 함수
   * @param blocker_idx
   * @param blocked_idx
   * @param tx
   * @returns 없다면 null
   */
  async findBlockUser(
    blocker_idx: number,
    blocked_idx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.postBlockedUsers.findFirst({
      where: {
        blocker_idx: blocker_idx,
        blocked_idx: blocked_idx,
      },
    });
  }

  /**
   * 유저의 쪽지 차단 리스트 가져오는 함수
   * @param blocker_idx
   * @param tx
   * @returns
   */
  async getBlockedPostUser(blocker_idx: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.postBlockedUsers.findMany({
      where: {
        blocker_idx: blocker_idx,
      },
      select: {
        id: true,
        blocked: {
          select: {
            idx: true,
            user_id: true,
            nickname: true,
            profile_img: true,
          },
        },
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  /**
   * PostBlockUser테이블에 쪽지 차단 유저 추가
   * @param blocker_idx
   * @param blocked_idx
   * @param tx
   */
  async blockUser(
    blocker_idx: number,
    blocked_idx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    await prismaClient.postBlockedUsers.create({
      data: {
        blocker_idx: blocker_idx,
        blocked_idx: blocked_idx,
      },
    });
    return;
  }

  /**
   * blocker의 blocked 유저 차단 해제
   * @param blocker_idx
   * @param blocked_idx
   * @param tx
   * @returns
   */
  async unblockUser(
    blocker_idx: number,
    blocked_idx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    await prismaClient.postBlockedUsers.delete({
      where: {
        blocker_idx_blocked_idx: {
          blocker_idx: blocker_idx,
          blocked_idx: blocked_idx,
        },
      },
    });
    return;
  }
}
