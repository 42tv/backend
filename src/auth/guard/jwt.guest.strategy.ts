import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from '../constants';

@Injectable()
export class JwtIdxStrategy extends PassportStrategy(Strategy, 'guest-jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.access_secret,
    });
  }

  async validate(payload: any) {
    return {
      idx: payload.idx,
      userId: payload.user_id,
      nickname: payload.nickname,
      is_guest: payload.is_guest,
    };
  }
}
