import { BadRequestException, Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class OauthService {
  private googleOauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID as string,
    process.env.GOOGLE_CLIENT_SECRET as string,
    process.env.GOOGLE_REDIRECT_URI as string,
  );

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  getGoogleLoginURL() {
    const googleScope = ['https://www.googleapis.com/auth/userinfo.email'];
    const authorizationUrl = this.googleOauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: googleScope,
      include_granted_scopes: true,
    });
    return authorizationUrl;
  }

  async getGoogleLoginJwt(code: string): Promise<string> {
    console.log(code);
    const { tokens } = await this.googleOauth2Client.getToken(code);
    console.log(tokens);
    this.googleOauth2Client.setCredentials(tokens);

    // Get user info - email
    const oauth2 = google.oauth2({
      auth: this.googleOauth2Client,
      version: 'v2',
    });
    const { data } = await oauth2.userinfo.get();
    if (!data.email) {
      throw new BadRequestException('No email found');
    }
    console.log(data);
    const email = data.email;
    const findedUser = await this.userService.findByUserIdWithOauth(
      email,
      'google',
      data.id,
    );
    if (!findedUser) {
      const user = await this.userService.createUserWithOAuth(
        email,
        'google@' + data.email,
        'google',
        data.id,
      );
      const jwt = await this.authService.jwtSign({
        sub: user.user_idx,
        user_id: user.user_id,
        nickname: user.nickname,
      });
      return jwt;
    }
    const jwt = await this.authService.jwtSign({
      sub: findedUser.user_idx,
      user_id: findedUser.user_id,
      nickname: findedUser.nickname,
    });
    return jwt;
  }
}
