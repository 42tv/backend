import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserIncludeOptions } from 'src/utils/utils';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * user_id로 유저 찾기
   * @param user_id
   * @returns
   */
  async findByUserId(user_id: string, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    const user = await prismaClient.user.findUnique({
      where: {
        user_id: user_id,
      },
    });
    return user;
  }

  /**
   * 닉네임으로 유저 찾기
   * @param nickname
   * @param tx
   * @returns
   */
  async findByUserNickname(nickname: string, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.user.findUnique({
      where: {
        nickname: nickname,
      },
    });
  }

  /**
   * 유저 닉네임 업데이트
   * @param user_idx
   * @param nickname
   * @param tx
   * @returns
   */
  async updateNickname(
    user_idx: number,
    nickname: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.user.update({
      where: {
        idx: user_idx,
      },
      data: {
        nickname: nickname,
      },
    });
  }

  /**
   * 비밀번호 변경
   * @param user_idx
   * @param new_password
   * @param tx
   * @returns
   */
  async updatePassword(
    user_idx: number,
    new_password: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    const user = await prismaClient.user.update({
      where: {
        idx: user_idx,
      },
      data: {
        password: new_password,
      },
    });
    return user;
  }

  /**
   * Oauth로그인 과정에서 유저가 있는지 확인하기 위한 함수
   * @param user_id
   * @param oauth_provider
   * @param oauth_id
   * @returns 없으면 null
   */
  async findByUserIdWithOauth(
    user_id: string,
    oauth_provider: string,
    oauth_id: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.user.findUnique({
      where: {
        user_id: user_id,
        oauth_provider: oauth_provider,
        oauth_provider_id: oauth_id,
      },
    });
  }

  /**
   * idx로 유저 검색
   * @param user_idx
   */
  async findByUserIdx(user_idx: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.user.findUnique({
      where: {
        idx: user_idx,
      },
    });
  }

  /**
   * 선택적 relation을 포함한 User 가져오기
   * @param user_idx
   * @param includeOptions
   * @param tx
   * @returns
   */
  async getUserWithRelations(
    user_idx: number,
    includeOptions: UserIncludeOptions,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.user.findUnique({
      where: {
        idx: user_idx,
      },
      include: {
        ...(includeOptions.user_detail && { user_detail: true }),
        ...(includeOptions.channel && { channel: true }),
        ...(includeOptions.braodcast_setting && { broadcastSetting: true }),
        ...(includeOptions.ivs_channel && { ivs: true }),
        ...(includeOptions.coin && { coin: true }),
      },
    });
  }

  /**
   * 선택적 relation을 포함한 User 가져오기 UserId로
   * @param user_idx
   * @param includeOptions
   * @param tx
   * @returns
   */
  async getUserByUserIdWithRelations(
    user_id: string,
    includeOptions: UserIncludeOptions,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.user.findUnique({
      where: {
        user_id: user_id,
      },
      include: {
        ...(includeOptions.user_detail && { user_detail: true }),
        ...(includeOptions.channel && { channel: true }),
        ...(includeOptions.braodcast_setting && { broadcastSetting: true }),
        ...(includeOptions.ivs_channel && { ivs: true }),
        ...(includeOptions.coin && { coin: true }),
      },
    });
  }

  /**
   * User 생성
   * @param user_id
   * @param hash
   * @param nickname
   * @param tx
   * @returns
   */
  async createUser(user_id, hash, nickname, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.user.create({
      data: {
        user_id: user_id,
        password: hash,
        nickname: nickname,
      },
    });
  }

  /**
   * Oauth 유저생성
   * @param user_id
   * @param nickname
   * @returns
   */
  async createUserWithOAuth(
    user_id: string,
    nickname: string,
    provider: string,
    provider_id: string,
  ) {
    return await this.prisma.user.create({
      data: {
        user_id: user_id,
        nickname: nickname,
        oauth_provider: provider,
        oauth_provider_id: provider_id,
      },
    });
  }

  /**
   * 프로필 이미지 URL 업데이트
   * @param user_idx
   * @param profile_img_url
   * @param tx
   * @returns
   */
  async updateProfileImage(
    user_idx: number,
    profile_img_url: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.user.update({
      where: {
        idx: user_idx,
      },
      data: {
        profile_img: profile_img_url,
      },
    });
  }

  /**
   * 북마크 가져오기
   * @param user_idx 요청자
   * @param stramer_idx 대상
   * @param tx
   * @returns
   */
  async getBookmarkByStreamerIdx(
    user_idx,
    stramer_idx,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.bookmark.findUnique({
      where: {
        bookmarker_idx_bookmarked_idx: {
          bookmarker_idx: user_idx,
          bookmarked_idx: stramer_idx,
        },
      },
    });
  }

  /**
   * User의 북마크 리스트 가져오기
   * @param user_idx
   * @param tx
   * @returns
   */
  async getBookmarks(user_idx, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.bookmark.findMany({
      where: {
        bookmarker: {
          idx: user_idx,
        },
      },
      include: {
        bookmarked: {
          select: {
            idx: true,
            user_id: true,
            profile_img: true,
            nickname: true,
          },
        },
      },
    });
  }

  /**
   * DB에 북마크 추가
   * @param user_idx
   * @param bookmark_idx
   * @param tx
   * @returns
   */
  async addBookmark(user_idx, bookmark_idx, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.bookmark.create({
      data: {
        bookmarker: {
          connect: {
            idx: user_idx,
          },
        },
        bookmarked: {
          connect: {
            idx: bookmark_idx,
          },
        },
      },
    });
  }

  /**
   * DB에서 북마크 삭제
   * @param user_idx 북마크 한 유저 idx
   * @param deleted_idx 북마크 삭제할 유저 idx
   * @param tx
   * @returns
   */
  async deleteBookmark(
    user_idx: number,
    deleted_idx: number,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.bookmark.delete({
      where: {
        bookmarker_idx_bookmarked_idx: {
          bookmarker_idx: user_idx,
          bookmarked_idx: deleted_idx,
        },
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
