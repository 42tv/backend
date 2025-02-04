import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ChannelService } from 'src/channel/channel.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private channelService: ChannelService,
  ) {}

  async validateUser(username: string, pw: string): Promise<any> {
    const user = await this.userService.findOneByLocalAuth(username, pw); // 비밀번호는 별도로 비교
    if (user && (await bcrypt.compare(pw, user.password))) {
      const { password, ...result } = user; // eslint-disable-line @typescript-eslint/no-unused-vars
      return result; // 비밀번호 제거 후 반환
    }
    return null; // 인증 실패
  }

  jwtSign(payload: any) {
    return this.jwtService.sign(payload);
  }

  async login(user: any) {
    const payload = {
      idx: user.idx,
      user_id: user.user_id,
      nickname: user.nickname,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async verifyPhone(payload: any) {
    const user = await this.userService.findByUserIdx(payload.idx);
    return await this.channelService.verifyPhone(user.idx);
  }
}
