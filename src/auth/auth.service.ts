import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import {
  AuthenticatedUser,
  JwtPayload,
  TokenPair,
  PlayToken,
  PhoneVerificationPayload,
} from './interfaces/auth.interface';
import { WebsocketJwt } from 'src/play/interfaces/websocket';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    username: string,
    pw: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.userService.findOneByLocalAuth(username, pw); // 비밀번호는 별도로 비교
    if (user && (await bcrypt.compare(pw, user.password))) {
      const { password, ...result } = user; // eslint-disable-line @typescript-eslint/no-unused-vars
      return result; // 비밀번호 제거 후 반환
    }
    return null; // 인증 실패
  }

  generateToken(payload: JwtPayload): TokenPair {
    const access_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '1d',
    });
    const refresh_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });
    return { access_token, refresh_token };
  }

  generatePlayToken(payload: JwtPayload | WebsocketJwt): PlayToken {
    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_PLAY_SECRET,
      expiresIn: '60s',
    });
    return { token };
  }

  login(user: AuthenticatedUser): TokenPair {
    const payload: JwtPayload = {
      idx: user.idx,
      user_id: user.user_id,
      nickname: user.nickname,
      profile_img: user.profile_img,
      is_guest: false,
    };
    const { access_token, refresh_token } = this.generateToken(payload);
    return { access_token, refresh_token };
  }

  validate(token: string) {
    try {
      return this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  decode(token: string) {
    return this.jwtService.decode(token);
  }

  async verifyPhone(payload: PhoneVerificationPayload) {
    console.log(payload);
    // const user = await this.userService.findByUserIdx(payload.idx);
    // return await this.channelService.verifyPhone(user.idx);
    return null;
  }

  /**
   * 게스트 토큰 발급
   * @returns 게스트 토큰
   */
  generateGuestToken() {
    const payload: JwtPayload = { is_guest: true, guest_id: `${uuidv4()}` };
    return this.generateToken(payload);
  }

  /**
   * 로그인 정보 조회 로직
   * @param authorizationHeader Authorization 헤더 값
   * @returns 로그인 정보 또는 게스트 정보
   */
  async getLoginInfo(authorizationHeader: string | undefined) {
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      // 토큰이 없거나 형식이 잘못된 경우, 새로운 게스트 토큰과 함께 게스트 정보 반환
      const guestTokens = this.generateGuestToken();
      return { is_guest: true, tokens: guestTokens };
    }

    const token = authorizationHeader.split(' ')[1];
    const decoded = this.validate(token);

    // 게스트 토큰인지 확인
    if (decoded.is_guest) {
      // 게스트 정보 반환
      return {
        is_guest: true,
        guest_id: decoded.guest_id,
      };
    }

    // 사용자 토큰인 경우, 사용자 상세 정보 조회
    const user_idx = decoded.idx;
    if (!user_idx || isNaN(user_idx)) {
      throw new BadRequestException('Invalid user index in token');
    }

    const user = await this.userService.findByUserIdx(user_idx);
    if (!user) {
      // 사용자를 찾을 수 없는 경우 (토큰이 오래되었거나 사용자가 삭제된 경우)
      throw new BadRequestException('User not found');
    }

    // 인증된 사용자 정보 반환
    return {
      is_guest: false,
      user: {
        idx: user.idx,
        user_id: user.user_id,
        nickname: user.nickname,
        profile_img: user.profile_img,
        is_guest: false,
        is_admin: user.is_admin,
      },
    };
  }
}
