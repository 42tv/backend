import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { ChannelService } from 'src/channel/channel.service';
import { Prisma } from '@prisma/client';
import { UserRepository } from './user.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { IvsService } from 'src/ivs/ivs.service';
import { FanLevelService } from 'src/fan-level/fan-level.service';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly channelService: ChannelService,
    @Inject(forwardRef(() => IvsService))
    private readonly ivsService: IvsService,
    private readonly prisma: PrismaService,
    private readonly fanLevelService: FanLevelService,
  ) {}

  /**
   * Passport를 사용한 LocalAuth 과정(username, password)에 필요한 유저 인증 함수
   * @param user_id
   * @param password
   * @returns
   */
  async findOneByLocalAuth(user_id: string, password: string) {
    const user = await this.userRepository.findByUserId(user_id);
    console.log(user);
    if (!user) {
      throw new BadRequestException('존재하지 않는 아이디입니다');
    }
    const compare = await bcrypt.compare(password, user.password);
    if (!compare) {
      throw new BadRequestException('비밀번호가 일치하지 않습니다');
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
   * User의 id로 찾기
   * @param user_id
   * @param tx
   * @returns
   */
  async findByUserId(user_id: string, tx?: Prisma.TransactionClient) {
    return await this.userRepository.findByUserId(user_id, tx);
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
    const nickname = await this.userRepository.findByUserNickname(
      createUserDto.nickname,
      tx,
    );
    if (nickname) {
      throw new BadRequestException('이미 존재하는 닉네임입니다.');
    }

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(createUserDto.password, salt);

    try {
      return await this.prisma.$transaction(async (tx) => {
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
        await tx.broadCastSetting.create({
          data: {
            User: {
              connect: {
                idx: createdUser.idx,
              },
            },
            title: `${createdUser.user_id}의 채널입니다`,
          },
        });
        //AWS IVS 채널 생성
        await this.ivsService.createIvs(createdUser.user_id, tx);
        //FanLevel 브실골플다 생성
        await this.fanLevelService.createInitFanLevel(createdUser.idx, tx);
        const sanitizedUser = { ...createdUser };
        delete sanitizedUser.password;
        return sanitizedUser;
      });
    } catch (error) {
      console.log(error);
      throw new BadRequestException('User, Channel, Ivs 생성 트랜잭션 실패');
    }
  }

  /**
   * User Nickname 변경
   * @param user_idx
   * @param nickname
   * @returns
   */
  async updateNickname(user_idx: number, nickname: string) {
    const user = await this.userRepository.findByUserIdx(user_idx);
    if (!user) {
      throw new BadRequestException('존재하지 않는 유저입니다');
    }
    if (user.nickname === nickname) {
      return {
        user: user,
        message: '이용가능한 닉네임입니다',
      };
    }
    if (nickname.length < 1 || nickname.length > 10) {
      throw new BadRequestException(
        '닉네임은 1자리 이상 10자리 이하로 입력해주세요',
      );
    }

    let updatedUser;
    await this.prisma.$transaction(async (tx) => {
      const findedUser = await this.userRepository.findByUserNickname(
        nickname,
        tx,
      );
      if (findedUser) {
        throw new BadRequestException('이미 존재하는 닉네임입니다');
      }
      updatedUser = await this.userRepository.updateNickname(
        user_idx,
        nickname,
        tx,
      );
    });
    return {
      user: updatedUser,
      message: '닉네임이 변경되었습니다',
    };
  }

  async updatePassword(
    user_idx: number,
    password: string,
    new_password: string,
  ) {
    const user = await this.userRepository.findByUserIdx(user_idx);
    if (!user) {
      throw new BadRequestException('존재하지 않는 유저입니다');
    }
    const compare = await bcrypt.compare(password, user.password);
    if (!compare) {
      throw new BadRequestException('비밀번호가 일치하지 않습니다');
    }

    const regex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!regex.test(new_password)) {
      throw new BadRequestException(
        '새 비밀번호는 8자리 이상 알파벳,숫자,특수문자 1개씩 이상이어야 합니다',
      );
    }
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(new_password, salt);
    const updatedUser = await this.userRepository.updatePassword(
      user_idx,
      hash,
    );
    const sanitizedUser = { ...updatedUser };
    delete sanitizedUser.password;
    return {
      user: sanitizedUser,
      message: '비밀번호가 변경되었습니다',
    };
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
