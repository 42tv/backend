import { Controller, Get, Request, Res } from '@nestjs/common';

import { OauthService } from './oauth.service';

@Controller('oauth')
export class OauthController {
  constructor(private readonly oauthService: OauthService) {}

  @Get('google/login')
  async googleLogin(@Res() res) {
    res.redirect(this.oauthService.getGoogleLoginURL());
  }

  @Get('google/callback')
  async googleCallback(@Request() req, @Res() res) {
    const code = req.query.code as string;
    const jwt = await this.oauthService.getGoogleLoginJwt(code);
    res.cookie('jwt', jwt);
    res.redirect(`${process.env.FRONTEND_REDIRECT_URI}`);
  }
}
