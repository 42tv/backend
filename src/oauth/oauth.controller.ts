import { Controller, Get, Request, Res } from '@nestjs/common';

import { OauthService } from './oauth.service';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';

@ApiTags('oauth')
@Controller('oauth')
export class OauthController {
  constructor(private readonly oauthService: OauthService) {}

  @Get('google/login')
  @ApiOperation({ summary: '구글 Oauth 로그인 요청 URL' })
  @ApiResponse({
    status: 302,
    description: 'Google OAuth 로그인 페이지로 리다이렉트',
  })
  async googleLogin(@Res() res) {
    res.redirect(this.oauthService.getGoogleLoginURL());
  }

  @Get('google/callback')
  @ApiOperation({
    summary: '구글 Oauth 콜백 주소',
    description: 'jwt쿠키 세팅 후 redirect',
  })
  @ApiResponse({
    status: 302,
    description: 'JWT 쿠키 설정 후 프론트엔드로 리다이렉트',
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 인증 코드',
  })
  async googleCallback(@Request() req, @Res() res) {
    const code = req.query.code as string;
    const jwt = await this.oauthService.getGoogleLoginJwt(code);
    res.cookie('jwt', jwt);
    res.redirect(`${process.env.FRONTEND_REDIRECT_URI}`);
  }
}
