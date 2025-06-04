import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { ChannelService } from 'src/channel/channel.service';
import { Prisma } from '@prisma/client';
import { UserRepository } from './user.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { IvsService } from 'src/ivs/ivs.service';
import { FanLevelService } from 'src/fan-level/fan-level.service';
import { BroadcastSettingDto } from './dto/broadcast-setting.dto';
import { BroadcastSettingService } from 'src/broadcast-setting/broadcast-setting.service';
import { AwsService } from 'src/aws/aws.service';
import * as sharp from 'sharp';
import { UserIncludeOptions } from 'src/utils/utils';
import { BookmarkService } from 'src/bookmark/bookmark.service';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly channelService: ChannelService,
    @Inject(forwardRef(() => IvsService))
    private readonly ivsService: IvsService,
    private readonly prisma: PrismaService,
    private readonly fanLevelService: FanLevelService,
    private readonly broadcastSettingService: BroadcastSettingService,
    private readonly awsService: AwsService,
    private readonly bookmarkService: BookmarkService,
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
   * user_idx로 유저 찾기
   * @param user_idx
   * @param includeOptions
   * @returns
   */
  async getUserWithRelations(
    user_idx: number,
    includeOptions: UserIncludeOptions = {},
  ) {
    return await this.userRepository.getUserWithRelations(
      user_idx,
      includeOptions,
    );
  }
  /**
   * user_id로 유저 찾기
   * @param user_idx
   * @param includeOptions
   * @returns
   */
  async getUserByUserIdWithRelations(
    user_id: string,
    includeOptions: UserIncludeOptions = {},
  ) {
    return await this.userRepository.getUserByUserIdWithRelations(
      user_id,
      includeOptions,
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
        //유저 생성
        const createdUser = await this.userRepository.createUser(
          createUserDto.id,
          hash,
          createUserDto.nickname,
          tx,
        );
        //채널 생성
        await this.channelService.createChannel(
          createdUser.idx,
          createdUser.user_id,
          tx,
        );
        //방송 설정 생성
        await this.broadcastSettingService.createBroadcastSetting(
          createdUser.idx,
          createdUser.user_id,
          tx,
        );
        //AWS IVS 채널 생성
        await this.ivsService.createIvs(createdUser.user_id, tx);
        //팬레벨 생성
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
    // MemberGuard에서 이미 유저 존재 여부를 검증했으므로 현재 닉네임만 조회
    const user = await this.userRepository.findByUserIdx(user_idx);
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

  /**
   * 패스워드 변경
   * @param user_idx
   * @param password
   * @param new_password
   * @returns
   */
  async updatePassword(
    user_idx: number,
    password: string,
    new_password: string,
  ) {
    // MemberGuard에서 이미 유저 존재 여부를 검증했으므로 바로 조회
    const user = await this.userRepository.findByUserIdx(user_idx);
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

  /**
   * 브로드캐스팅 설정 가져오기
   * @param user_idx
   * @returns
   */
  async getBroadcastSetting(user_idx: number) {
    // MemberGuard에서 이미 유저 존재 여부를 검증했으므로 바로 조회
    const user = await this.userRepository.getUserWithRelations(user_idx, {
      ivs_channel: true,
      braodcast_setting: true,
    });
    console.log(user);
    const sanitizedUser = {
      idx: user.idx,
      user_id: user.user_id,
      profile_img: user.profile_img,
      nickname: user.nickname,
      ivs: {
        stream_key: user.ivs.stream_key,
        ingest_endpoint: user.ivs.ingest_endpoint,
        playback_url: user.ivs.playback_url,
      },
      broadcastSetting: user.broadcastSetting,
    };
    return sanitizedUser;
  }

  /**
   * user_idx의 broadcastSEtting 업데이트
   * @param user_idx
   * @param settingDto
   * @returns
   */
  async updateBroadcastSetting(
    user_idx: number,
    settingDto: BroadcastSettingDto,
  ) {
    // MemberGuard에서 이미 유저 존재 여부를 검증했으므로 바로 조회
    const user = await this.userRepository.getUserWithRelations(user_idx, {
      braodcast_setting: true,
    });

    try {
      await this.broadcastSettingService.updateBroadcastSetting(
        user.idx,
        settingDto.title,
        settingDto.isAdult,
        settingDto.isPrivate,
        settingDto.isFanClub,
        settingDto.fanLevel,
        settingDto.isPrivate ? settingDto.password : null,
      );
    } catch (e) {
      console.log(e);
      throw new BadRequestException('업데이트에 실패했습니다');
    }
    return {
      message: '방송 설정이 변경되었습니다',
    };
  }

  /**
   * User 프로필을 s3에 업로드 하고 DB에 주소 저장
   * @param user_idx
   * @param file
   */
  async uploadProfileImage(user_idx: number, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('파일이 없습니다');
    }
    if (
      !file.mimetype.endsWith('jpeg') &&
      !file.mimetype.endsWith('png') &&
      !file.mimetype.endsWith('jpg')
    ) {
      throw new BadRequestException('jpeg, png, jpg 파일만 업로드 가능합니다');
    }
    if (file.size > 1024 * 1024 * 5) {
      throw new BadRequestException(
        '파일 사이즈는 5MB 이하로 업로드 가능합니다',
      );
    }
    // MemberGuard에서 이미 유저 존재 여부를 검증했으므로 바로 조회
    const user = await this.userRepository.findByUserIdx(user_idx);

    try {
      // 기존 프로필 이미지가 있는지 확인하고 있으면 삭제
      if (user.profile_img) {
        // URL에서 파일명 추출 (URL에 S3 버킷 경로가 포함되어 있다고 가정)
        const profileUrl = user.profile_img;
        const keyMatch = profileUrl.match(/profile\/.*$/);

        if (keyMatch) {
          const oldKey = keyMatch[0];
          try {
            // 원본 프로필 이미지와 리사이즈된 이미지 모두 삭제 시도
            await this.awsService.deleteFromS3(oldKey);
            console.log(`기존 프로필 이미지 삭제 완료: ${oldKey}`);
          } catch (error) {
            console.log(`기존 프로필 이미지 삭제 실패: ${error.message}`);
            // 기존 파일 삭제 실패해도 계속 진행
          }
        }
      }

      // 이미지 리사이징 및 업로드
      const buffer = await sharp(file.buffer)
        .resize(400, 400)
        .toFormat('jpeg')
        .toBuffer();

      const resizedKey = `profile/${user.user_id}-${Date.now()}.jpg`;
      await this.awsService.uploadToS3(resizedKey, buffer, 'image/jpeg');

      // S3 버킷 베이스 URL 생성
      const profileImageUrl = `${process.env.CDN_URL}/${resizedKey}`;

      // DB의 사용자 프로필 이미지 URL 업데이트
      await this.userRepository.updateProfileImage(user_idx, profileImageUrl);

      console.log('프로필 이미지 업로드 및 업데이트 완료');
      return profileImageUrl;
    } catch (error) {
      console.error('프로필 이미지 업로드 실패:', error);
      throw new BadRequestException('프로필 이미지 업로드에 실패했습니다');
    }
  }

  /**
   * 자신이 추가한 Streamer_idx의 북마크 가져오기
   */
  async getBookmarkByStreamerIdx(user_idx: number, streamer_idx: number) {
    const isBookmarked = await this.userRepository.getBookmarkByStreamerIdx(
      user_idx,
      streamer_idx,
    );
    return {
      is_bookmarked: isBookmarked,
    };
  }

  /**
   * 자신의 북마크 리스트 가져오기
   * @param user_idx
   * @returns
   */
  async getBookmarks(user_idx: number) {
    // MemberGuard에서 이미 유저 존재 여부를 검증했으므로 바로 조회
    const user = await this.userRepository.findByUserIdx(user_idx);
    const bookmarks = await this.userRepository.getBookmarks(user.idx);
    const transformedBookmarks = bookmarks.map((bookmark) => {
      const { idx, ...rest } = bookmark.bookmarked || {};
      return {
        id: bookmark.id,
        hidden: bookmark.hidden,
        user_idx: idx, // idx를 user_idx로 리네이밍
        ...rest, // 나머지 속성 추가
      };
    });

    return {
      lists: transformedBookmarks,
      message: '북마크 리스트 조회 완료',
    };
  }

  /**
   * 북마크 추가
   * @param user_idx
   * @param bookmarkedUserId
   * @returns
   */
  async addBookmark(user_idx: number, bookmarkedUserId: string) {
    // MemberGuard에서 이미 유저 존재 여부를 검증했으므로 바로 조회
    const user = await this.userRepository.findByUserIdx(user_idx);
    const bookmarkedUser =
      await this.userRepository.findByUserId(bookmarkedUserId);
    if (!bookmarkedUser) {
      throw new NotFoundException('존재하지 않는 유저입니다');
    }
    await this.bookmarkService.addBookmark(user.idx, bookmarkedUser.idx);
    return {
      message: '북마크 추가 완료',
    };
  }

  /**
   * 북마크 삭제
   * @param user_idx 북마크를 삭제하려는 유저의 idx
   * @param deleted_user_id 북마크에서 삭제될 유저의 user_id
   * @returns
   */
  async deleteBookmark(user_idx: number, deleted_user_id: string) {
    // MemberGuard에서 이미 유저 존재 여부를 검증했으므로 바로 조회
    const user = await this.userRepository.findByUserIdx(user_idx);
    const deletedUser = await this.userRepository.findByUserId(deleted_user_id);
    if (!deletedUser) {
      throw new NotFoundException('삭제할 유저가 존재하지 않습니다.');
    }
    await this.bookmarkService.removeBookmark(user.idx, deletedUser.idx);
    return {
      message: '북마크 삭제 완료',
    };
  }

  /**
   * 북마크 여러개 삭제
   */
  async deleteBookmarks(user_idx: number, ids: number[]) {
    // MemberGuard에서 이미 유저 존재 여부를 검증했으므로 바로 조회
    const user = await this.userRepository.findByUserIdx(user_idx);
    try {
      await this.bookmarkService.deleteBookmarks(user.idx, ids);
    } catch (e) {
      throw new BadRequestException('유효하지 않은 북마크 삭제요청입니다');
    }

    return {
      message: '북마크 삭제 완료',
    };
  }
}
