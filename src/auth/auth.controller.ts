import {
  Controller,
  Request,
  Post,
  UseGuards,
  Res,
  Get,
  Req,
  HttpStatus,
} from '@nestjs/common';
import { LocalAuthGuard } from './guard/local-auth.guard';
import { AuthService } from './auth.service';
import { MemberGuard } from './guard/jwt.member.guard';
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
import { UserService } from 'src/user/user.service';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

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
    const { access_token, refresh_token } = this.authService.login(req.user);
    res.cookie('jwt', access_token, { httpOnly: true });
    res.cookie('refresh', refresh_token, { httpOnly: true });
    res.send({ access_token, refresh_token });
    return { access_token, refresh_token };
  }

  /**
   * 휴대폰 본인 인증 경로(가칭)
   */
  @Post('phone-verification')
  @ApiOperation({ summary: '가칭. 본인인증 성공했을시 stream, ivs 만드는용도' })
  @ApiBearerAuth()
  @UseGuards(MemberGuard)
  async phoneVerification(@Request() req) {
    console.log(req.user);
    return await this.authService.verifyPhone(req.user);
  }

  /**
   * 로그아웃 처리
   * @param res 쿠키를 삭제하기 위한 Response 객체
   * @returns 로그아웃 성공 메시지
   */
  @Post('logout')
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({
    status: 201,
    description: '로그아웃 성공',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Successfully logged out' },
      },
    },
  })
  async logout(@Res() res) {
    // Clear authentication cookies by setting to empty with expired date
    res.cookie('jwt', '', { httpOnly: true, expires: new Date(0) });
    res.cookie('refresh', '', { httpOnly: true, expires: new Date(0) });
    res.send({ message: 'Successfully logged out' });
  }

  /**
   * 로그인 정보 조회
   * @param req 요청 객체
   * @param res 응답 객체 (쿠키 설정을 위해 추가)
   * @returns 로그인 정보 또는 게스트 정보 반환
   */
  @Get('login_info')
  @ApiOperation({ summary: '로그인 정보 조회' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '로그인 정보 조회 성공 또는 게스트 정보 반환',
  })
  @ApiBearerAuth()
  async getLoginInfo(@Req() req, @Res({ passthrough: true }) res: Response) {
    const authorizationHeader = req.headers.authorization;
    const loginInfo = await this.authService.getLoginInfo(authorizationHeader);

    // loginInfo가 게스트이고 tokens 객체를 포함하는 경우 access_token을 쿠키에 설정
    if (loginInfo && loginInfo.isGuest && loginInfo.tokens) {
      res.cookie('jwt', loginInfo.tokens.access_token, { httpOnly: true });
      delete loginInfo.tokens;
    }
    return loginInfo; // 로그인 정보 또는 게스트 상태 반환
  }
}
