import { Module } from '@nestjs/common';
import { OauthController } from './oauth.controller';
import { OauthService } from './oauth.service';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { LogModule } from '../log/log.module';

@Module({
  imports: [UserModule, AuthModule, LogModule],
  controllers: [OauthController],
  providers: [OauthService],
  exports: [OauthService],
})
export class OauthModule {}
