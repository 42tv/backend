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
  ApiTags,
} from '@nestjs/swagger';
import { JwtRefreshGaurd } from './guard/jwt.refresh.guard';
import { Response } from 'express';
import { LoginDto, LoginFailResponse, LoginResponseDto } from './dto/login.dto';
import { RefreshDto, RefreshResponseDto } from './dto/refresh.dto';
import { LogoutResponseDto } from './dto/logout.dto';
import { LoginInfoResponseDto } from './dto/login.info.dto';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { TokenPair } from './interfaces/auth.interface';

@ApiTags('Authentication - 인증 관련 API')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * 기본 local 인증을 사용한 로그인(username, password)
   * @param req req.user에 postgres로부터 username(id), password를 지닌 user 객체가 담겨있음
   * @returns access_token에 jwt를 담아서 반납(idx, user_id, nickname 정보를 담음)
   */
  @Post('login')
  @ApiOperation({
    summary: '사용자 로그인',
    description: '사용자 ID와 비밀번호로 로그인하여 JWT 토큰을 발급받습니다.',
  })
  @ApiBody({
    description: '로그인 요청 데이터 (Swagger용)',
    type: LoginDto,
  })
  @ApiResponse({
    status: 201,
    description: '로그인 성공',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '로그인 실패',
    type: LoginFailResponse,
  })
  @UseGuards(LocalAuthGuard)
  async login(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SuccessResponseDto<{ tokens: TokenPair }>> {
    const tokens = this.authService.login(req.user);
    res.cookie('jwt', tokens.access_token, { httpOnly: true });
    res.cookie('refresh', tokens.refresh_token, { httpOnly: true });
    return ResponseWrapper.success({ tokens }, '로그인에 성공했습니다.');
  }

  @Post('refresh')
  @ApiOperation({
    summary: '토큰 갱신',
    description: '리프레시 토큰을 사용하여 새로운 액세스 토큰을 발급받습니다.',
  })
  @ApiBearerAuth()
  @ApiBody({
    description: '토큰 갱신 요청 데이터 (Swagger용)',
    type: RefreshDto,
  })
  @ApiResponse({
    status: 201,
    description: '리프레시 성공',
    type: RefreshResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'refresh token이 만료됨',
    type: LoginFailResponse,
  })
  @UseGuards(JwtRefreshGaurd)
  async refresh(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SuccessResponseDto<{ tokens: TokenPair }>> {
    const tokens = this.authService.login(req.user);
    res.cookie('jwt', tokens.access_token, { httpOnly: true });
    res.cookie('refresh', tokens.refresh_token, { httpOnly: true });
    return ResponseWrapper.success({ tokens }, '토큰을 갱신했습니다.');
  }

  /**
   * 휴대폰 본인 인증 경로(가칭)
   */
  @Post('phone-verification')
  @ApiOperation({ summary: '가칭. 본인인증 성공했을시 stream, ivs 만드는용도' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: '본인인증 성공',
  })
  @ApiResponse({
    status: 401,
    description: '인증되지 않은 사용자',
  })
  @UseGuards(MemberGuard)
  async phoneVerification(@Request() req): Promise<SuccessResponseDto<null>> {
    await this.authService.verifyPhone(req.user);
    return ResponseWrapper.success(null, '휴대폰 본인 인증이 완료되었습니다.');
  }

  /**
   * 로그아웃 처리
   * @param res 쿠키를 삭제하기 위한 Response 객체
   * @returns 로그아웃 성공 메시지
   */
  @Post('logout')
  @ApiOperation({
    summary: '사용자 로그아웃',
    description: '사용자를 로그아웃하고 인증 쿠키를 삭제합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '로그아웃 성공',
    type: LogoutResponseDto,
  })
  async logout(
    @Res({ passthrough: true }) res: Response,
  ): Promise<SuccessResponseDto<null>> {
    // Clear authentication cookies by setting to empty with expired date
    res.cookie('jwt', '', { httpOnly: true, expires: new Date(0) });
    res.cookie('refresh', '', { httpOnly: true, expires: new Date(0) });
    return ResponseWrapper.success(null, '성공적으로 로그아웃되었습니다.');
  }

  /**
   * 로그인 정보 조회
   * @param req 요청 객체
   * @param res 응답 객체 (쿠키 설정을 위해 추가)
   * @returns 로그인 정보 또는 게스트 정보 반환
   */
  @Get('login_info')
  @ApiOperation({
    summary: '로그인 정보 조회',
    description:
      '현재 사용자의 로그인 정보를 조회하거나 게스트 토큰을 발급합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '로그인 정보 조회 성공 또는 게스트 정보 반환',
    type: LoginInfoResponseDto,
  })
  @ApiBearerAuth()
  async getLoginInfo(
    @Req() req,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SuccessResponseDto<Record<string, unknown>>> {
    const authorizationHeader = req.headers.authorization;
    const loginInfo = await this.authService.getLoginInfo(authorizationHeader);

    // loginInfo가 게스트이고 tokens 객체를 포함하는 경우 access_token을 쿠키에 설정
    if (loginInfo && loginInfo.is_guest && loginInfo.tokens) {
      res.cookie('jwt', loginInfo.tokens.access_token, { httpOnly: true });
      delete loginInfo.tokens;
    }
    return ResponseWrapper.success(loginInfo, '로그인 정보를 조회했습니다.');
  }
}
