import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from '../constants';

@Injectable()
export class JwtIdxStrategy extends PassportStrategy(Strategy, 'jwt-idx') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.access_secret,
    });
  }

  async validate(payload: any) {
    // The validate function remains the same as the original MemberStrategy,
    // returning the necessary user information from the payload.
    // The check for 'idx' will be handled in the Guard.
    return {
      idx: payload.idx,
      userId: payload.user_id,
      nickname: payload.nickname,
    };
  }
}
