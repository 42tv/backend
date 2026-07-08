import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SanctionStatus, SanctionType } from '@prisma/client';
import { jwtConstants } from '../constants';
import { UserService } from 'src/user/user.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MemberStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private userService: UserService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.access_secret,
    });
  }

  async validate(payload: any) {
    if (!payload.idx) {
      throw new UnauthorizedException('Member Guard not allow guest');
    }

    // 실제 유저가 존재하는지 확인
    const user = await this.userService.findByUserIdx(payload.idx);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 계정 정지(ACCOUNT_SUSPEND) 활성 제재 확인 — 정지 계정은 모든 회원 API 차단
    // (모듈 순환 의존을 피하기 위해 SanctionRepository 대신 Prisma 직접 조회)
    const suspension = await this.prisma.sanction.findFirst({
      where: {
        user_idx: user.idx,
        type: SanctionType.ACCOUNT_SUSPEND,
        status: SanctionStatus.ACTIVE,
      },
    });
    if (suspension) {
      throw new ForbiddenException('정지된 계정입니다.');
    }

    return {
      idx: user.idx,
      userId: user.user_id,
      nickname: user.nickname,
      is_guest: payload.is_guest,
      is_admin: user.is_admin,
    };
  }
}
