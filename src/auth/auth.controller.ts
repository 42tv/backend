import { Controller, Request, Post, UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from './guard/local-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * 기본 local 인증을 사용한 로그인(username, password)
   * @param req req.user에 postgres로부터 username(id), password를 지닌 user 객체가 담겨있음
   * @returns access_token에 jwt를 담아서 반납(idx, user_id, nickname 정보를 담음)
   */
  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  /**
   * 휴대폰 본인 인증 경로(가칭)
   */
  @Post('phone-verification')
  async phoneVerification(@Request() req) {
    req.user = { user_idx: 1, user_id: 'test', nickname: 'test' };
    return await this.authService.verifyPhone(req.user);
  }
}
