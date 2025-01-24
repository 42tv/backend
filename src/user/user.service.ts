import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

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
  async createUser(createUserDto: CreateUserDto) {
    console.log(
      createUserDto.id,
      createUserDto.password,
      createUserDto.nickname,
    );
    if (createUserDto.password === '') {
      throw new BadRequestException('비밀번호를 입력해주세요');
    }
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(createUserDto.password, salt);
    return await this.prisma.user.create({
      data: {
        user_id: createUserDto.id,
        password: hash,
        nickname: createUserDto.nickname,
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
