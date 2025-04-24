import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtConstants } from '../constants';

@Injectable()
export class MemberStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
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
    return {
      idx: payload.idx,
      userId: payload.user_id,
      nickname: payload.nickname,
      is_guest: payload.is_guest,
    };
  }
}
