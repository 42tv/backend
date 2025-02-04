import { Controller, Get, Request, Res } from '@nestjs/common';

import { OauthService } from './oauth.service';
import { ApiOperation } from '@nestjs/swagger';

@Controller('oauth')
export class OauthController {
  constructor(private readonly oauthService: OauthService) {}

  @Get('google/login')
  @ApiOperation({ summary: '구글 Oauth 로그인 요청 URL' })
  async googleLogin(@Res() res) {
    res.redirect(this.oauthService.getGoogleLoginURL());
  }

  @Get('google/callback')
  @ApiOperation({
    summary: '구글 Oauth 콜백 주소',
    description: 'jwt쿠키 세팅 후 redirect',
  })
  async googleCallback(@Request() req, @Res() res) {
    const code = req.query.code as string;
    const jwt = await this.oauthService.getGoogleLoginJwt(code);
    res.cookie('jwt', jwt);
    res.redirect(`${process.env.FRONTEND_REDIRECT_URI}`);
  }
}
