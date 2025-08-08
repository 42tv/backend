import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PostRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 쪽지 생성 (통합된 Posts 테이블에 저장)
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
    const post = await prismaClient.posts.create({
      data: {
        content: message,
        sender_idx: sender_idx,
        receiver_idx: receiver_idx,
      },
    });

    return post;
  }

  /**
   * 받은 쪽지 리스트 가져오기
   * @param receiver_idx
   * @returns
   */
  async getPosts(receiver_idx: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.posts.findMany({
      where: {
        receiver_idx: receiver_idx,
        receiver_deleted: false,
      },
      orderBy: {
        sent_at: 'desc',
      },
      take: 100,
    });
  }

  /**
   * 받은 쪽지에서 보낸 사람 닉네임으로 검색
   * @param receiver_idx
   * @param nickname
   * @param tx
   * @returns
   */
  async getReceivePostsByNickname(
    receiver_idx: number,
    nickname: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    // 먼저 닉네임으로 사용자를 찾고, 그 사용자의 idx로 쪽지를 검색
    const sender = await prismaClient.user.findUnique({
      where: { nickname: nickname },
      select: { idx: true },
    });

    if (!sender) {
      return [];
    }

    return await prismaClient.posts.findMany({
      where: {
        receiver_idx: receiver_idx,
        sender_idx: sender.idx,
        receiver_deleted: false,
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
        sender_deleted: false,
      },
      orderBy: {
        sent_at: 'desc',
      },
      take: 100,
    });
  }

  /**
   * 보낸 쪽지에서 받은 사람 닉네임으로 검색
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
    // 먼저 닉네임으로 사용자를 찾고, 그 사용자의 idx로 쪽지를 검색
    const receiver = await prismaClient.user.findUnique({
      where: { nickname: nickname },
      select: { idx: true },
    });

    if (!receiver) {
      return [];
    }

    return await prismaClient.posts.findMany({
      where: {
        sender_idx: sender_idx,
        receiver_idx: receiver.idx,
        sender_deleted: false,
      },
      orderBy: {
        sent_at: 'desc',
      },
      take: 100,
    });
  }

  /**
   * 쪽지 읽기 (받은 쪽지 읽음 표시)
   * @param receiver_idx
   * @param postId
   * @param tx
   * @returns
   */
  async readPosts(
    receiver_idx: number,
    postId: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.posts.update({
      where: {
        id: postId,
        receiver_idx: receiver_idx,
      },
      data: {
        is_read: true,
        read_at: new Date(new Date().getTime() + 9 * 60 * 60 * 1000), // Korean time (UTC+9)
      },
    });
  }

  /**
   * 받은 쪽지 삭제 (소프트 삭제 후 양쪽 삭제시 하드 삭제)
   * @param receiver_idx
   * @param postId
   * @param tx
   * @returns
   */
  async deleteReceivedPost(
    receiver_idx: number,
    postId: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    // 먼저 소프트 삭제
    await prismaClient.posts.update({
      where: {
        id: postId,
        receiver_idx: receiver_idx,
      },
      data: {
        receiver_deleted: true,
      },
    });

    // 양쪽 모두 삭제 표시되었는지 확인하고 하드 삭제
    return await this.checkAndHardDeletePost(postId, prismaClient);
  }

  /**
   * 보낸 쪽지 삭제 (소프트 삭제 후 양쪽 삭제시 하드 삭제)
   * @param sender_idx
   * @param postId
   * @param tx
   * @returns
   */
  async deleteSentPost(
    sender_idx: number,
    postId: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    // 먼저 소프트 삭제
    await prismaClient.posts.update({
      where: {
        id: postId,
        sender_idx: sender_idx,
      },
      data: {
        sender_deleted: true,
      },
    });

    // 양쪽 모두 삭제 표시되었는지 확인하고 하드 삭제
    return await this.checkAndHardDeletePost(postId, prismaClient);
  }

  /**
   * 받은 쪽지 여러개 삭제 (소프트 삭제 후 양쪽 삭제시 하드 삭제)
   * @param receiver_idx
   * @param postIds
   * @param tx
   * @returns
   */
  async deleteReceivedPosts(
    receiver_idx: number,
    postIds: number[],
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    // 먼저 소프트 삭제
    await prismaClient.posts.updateMany({
      where: {
        receiver_idx: receiver_idx,
        id: {
          in: postIds,
        },
      },
      data: {
        receiver_deleted: true,
      },
    });

    // 양쪽 모두 삭제 표시된 쪽지들 하드 삭제
    return await this.checkAndHardDeletePosts(postIds, prismaClient);
  }

  /**
   * 보낸 쪽지 여러개 삭제 (소프트 삭제 후 양쪽 삭제시 하드 삭제)
   * @param sender_idx
   * @param postIds
   * @param tx
   * @returns
   */
  async deleteSentPosts(
    sender_idx: number,
    postIds: number[],
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    // 먼저 소프트 삭제
    await prismaClient.posts.updateMany({
      where: {
        sender_idx: sender_idx,
        id: {
          in: postIds,
        },
      },
      data: {
        sender_deleted: true,
      },
    });

    // 양쪽 모두 삭제 표시된 쪽지들 하드 삭제
    return await this.checkAndHardDeletePosts(postIds, prismaClient);
  }

  /**
   * 특정 쪽지가 양쪽 모두 삭제 표시되었는지 확인하고 하드 삭제
   * @param postId
   * @param tx
   * @returns
   */
  async checkAndHardDeletePost(postId: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;

    // 해당 쪽지가 양쪽 모두 삭제 표시되었는지 확인
    const post = await prismaClient.posts.findUnique({
      where: { id: postId },
      select: {
        sender_deleted: true,
        receiver_deleted: true,
      },
    });

    // 양쪽 모두 삭제 표시된 경우 하드 삭제
    if (post && post.sender_deleted && post.receiver_deleted) {
      return await prismaClient.posts.delete({
        where: { id: postId },
      });
    }

    return null;
  }

  /**
   * 여러 쪽지들 중 양쪽 모두 삭제 표시된 것들만 하드 삭제
   * @param postIds
   * @param tx
   * @returns
   */
  async checkAndHardDeletePosts(
    postIds: number[],
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    return await prismaClient.posts.deleteMany({
      where: {
        id: { in: postIds },
        sender_deleted: true,
        receiver_deleted: true,
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
    return await prismaClient.postBlockedUsers.findUnique({
      where: {
        blocker_idx_blocked_idx: {
          // 복합 고유 키 이름 사용
          blocker_idx: blocker_idx,
          blocked_idx: blocked_idx,
        },
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
