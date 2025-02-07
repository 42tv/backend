import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { ChannelService } from 'src/channel/channel.service';
import { Prisma } from '@prisma/client';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly channelService: ChannelService,
  ) {}

  /**
   * Passport를 사용한 LocalAuth 과정(username, password)에 필요한 유저 인증 함수
   * @param user_id
   * @param password
   * @returns
   */
  async findOneByLocalAuth(user_id: string, password: string) {
    const user = await this.userRepository.findByUserId(user_id);
    if (!user) {
      throw new BadRequestException('존재하지 않는 아이디입니다.');
    }
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
    return await this.userRepository.findByUserIdWithOauth(
      user_id,
      oauth_provider,
      oauth_id,
    );
  }

  /**
   * user_idx로 찾기
   * @param user_idx
   * @returns
   */
  async findByUserIdx(user_idx: number, tx?: Prisma.TransactionClient) {
    return await this.userRepository.findByUserIdx(user_idx, tx);
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
    const user = await this.userRepository.findByUserId(createUserDto.id, tx);
    if (user) {
      throw new BadRequestException('이미 존재하는 아이디입니다.');
    }

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(createUserDto.password, salt);

    const createdUser = await this.userRepository.createUser(
      createUserDto.id,
      hash,
      createUserDto.nickname,
      tx,
    );
    await this.channelService.createChannel(
      createdUser.idx,
      createdUser.user_id,
      tx,
    );
    return createdUser;
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
    return await this.userRepository.createUserWithOAuth(
      user_id,
      nickname,
      provider,
      provider_id,
    );
  }
}
