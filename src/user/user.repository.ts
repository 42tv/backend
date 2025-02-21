import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

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
    const user = await prismaClient.user.findFirst({
      where: {
        user_id: user_id,
      },
    });
    return user;
  }

  async findByUserNickname(nickname: string, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.user.findFirst({
      where: {
        nickname: nickname,
      },
    });
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
    return await prismaClient.user.findFirst({
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
    return await prismaClient.user.findFirst({
      where: {
        idx: user_idx,
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
}
