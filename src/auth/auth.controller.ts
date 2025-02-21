import { Controller, Request, Post, UseGuards, Res } from '@nestjs/common';
import { LocalAuthGuard } from './guard/local-auth.guard';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LoginResponse } from './entities/login.response';
import { AuthEntity, AuthFailResponse } from './entities/login.entity';
import { JwtRefreshGaurd } from './guard/jwt.refresh.guard';
import { RefreshResponse } from './entities/refresh.response';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * 기본 local 인증을 사용한 로그인(username, password)
   * @param req req.user에 postgres로부터 username(id), password를 지닌 user 객체가 담겨있음
   * @returns access_token에 jwt를 담아서 반납(idx, user_id, nickname 정보를 담음)
   */
  @Post('login')
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({
    status: 201,
    description: '로그인 성공',
    type: LoginResponse,
  })
  @ApiUnauthorizedResponse({
    description: '로그인 실패',
    type: AuthFailResponse,
  })
  @ApiBody({ description: 'Body 데이터', type: AuthEntity, required: true })
  @UseGuards(LocalAuthGuard)
  async login(@Request() req, @Res() res) {
    const { access_token, refresh_token } = this.authService.login(req.user);
    res.cookie('jwt', access_token, { httpOnly: true });
    res.cookie('refresh', refresh_token, { httpOnly: true });
    res.send({ access_token, refresh_token });
    return { access_token, refresh_token };
  }

  @Post('refresh')
  @ApiOperation({ summary: '리프레시 토큰' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: '리프레시 성공',
    type: RefreshResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'refresh token이 만료됨',
    type: AuthFailResponse,
  })
  @UseGuards(JwtRefreshGaurd)
  async refresh(@Request() req, @Res() res) {
    const { access_token } = this.authService.login(req.user);
    res.cookie('jwt', access_token, { httpOnly: true });
    res.send({ access_token });
    return { access_token };
  }

  /**
   * 휴대폰 본인 인증 경로(가칭)
   */
  @Post('phone-verification')
  @ApiOperation({ summary: '가칭. 본인인증 성공했을시 stream, ivs 만드는용도' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async phoneVerification(@Request() req) {
    console.log(req.user);
    return await this.authService.verifyPhone(req.user);
  }
}
