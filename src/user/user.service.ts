import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { ChannelService } from 'src/channel/channel.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly channelService: ChannelService,
  ) {}

  /**
   * Passport를 사용한 LocalAuth 과정(username, password)에 필요한 유저 인증 함수
   * @param user_id
   * @param password
   * @returns
   */
  async findOneByLocalAuth(user_id: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        user_id: user_id,
      },
    });
    const compare = await bcrypt.compare(password, user.password);
    if (!compare) {
      return null;
    }
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
  ) {
    return await this.prisma.user.findFirst({
      where: {
        user_id: user_id,
        oauth_provider: oauth_provider,
        oauth_provider_id: oauth_id,
      },
    });
  }

  /**
   * 기본 회원가입 함수
   * @param id
   * @param pw
   * @param nickname
   * @returns
   */
  async createUser(
    createUserDto: CreateUserDto,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    const user = await prismaClient.user.findFirst({
      where: {
        user_id: createUserDto.id,
      },
    });
    if (user) {
      throw new BadRequestException('이미 존재하는 아이디입니다.');
    }

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(createUserDto.password, salt);

    let createdUser;
    // 테스트용 코드때문에 추가된부분이긴 한데src 부적절해 보이긴 해도 방법이 없었음
    if (tx) {
      createdUser = await tx.user.create({
        data: {
          user_id: createUserDto.id,
          password: hash,
          nickname: createUserDto.nickname,
        },
      });
      await this.channelService.createChannel(
        createdUser.idx,
        createdUser.user_id,
        tx,
      );
      return createdUser;
    } else {
      await this.prisma.$transaction(async (tx) => {
        createdUser = await tx.user.create({
          data: {
            user_id: createUserDto.id,
            password: hash,
            nickname: createUserDto.nickname,
          },
        });
        await this.channelService.createChannel(
          createdUser.idx,
          createdUser.user_id,
          tx,
        );
      });
      return createdUser;
    }
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
