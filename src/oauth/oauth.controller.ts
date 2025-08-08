import { Controller, Get, Request, Res } from '@nestjs/common';

import { OauthService } from './oauth.service';
import {
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import {
  OAuthRedirectResponseDto,
  OAuthCallbackResponseDto,
  OAuthErrorResponseDto,
} from './dto/oauth-response.dto';

@ApiTags('oauth')
@Controller('oauth')
export class OauthController {
  constructor(private readonly oauthService: OauthService) {}

  @Get('google/login')
  @ApiOperation({ summary: '구글 OAuth 로그인 요청 URL' })
  @ApiResponse({
    status: 302,
    description: 'Google OAuth 로그인 페이지로 리다이렉트',
    type: OAuthRedirectResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'OAuth 설정 에러',
    type: OAuthErrorResponseDto,
  })
  async googleLogin(@Res() res) {
    res.redirect(this.oauthService.getGoogleLoginURL());
  }

  @Get('google/callback')
  @ApiOperation({
    summary: '구글 OAuth 콜백 주소',
    description: 'JWT 쿠키 설정 후 프론트엔드로 리다이렉트',
  })
  @ApiResponse({
    status: 302,
    description: 'JWT 쿠키 설정 후 프론트엔드로 리다이렉트',
    type: OAuthCallbackResponseDto,
  })
  @ApiBadRequestResponse({
    description: '잘못된 인증 코드 또는 OAuth 에러',
    type: OAuthErrorResponseDto,
  })
  async googleCallback(@Request() req, @Res() res) {
    const code = req.query.code as string;
    const jwt = await this.oauthService.getGoogleLoginJwt(code);
    res.cookie('jwt', jwt);
    res.redirect(`${process.env.FRONTEND_REDIRECT_URI}`);
  }
}
