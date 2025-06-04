import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtConstants } from '../constants';
import { UserService } from 'src/user/user.service';

@Injectable()
export class MemberStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private userService: UserService) {
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

    return {
      idx: payload.idx,
      userId: payload.user_id,
      nickname: payload.nickname,
      is_guest: payload.is_guest,
    };
  }
}
