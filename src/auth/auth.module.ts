import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './guard/local.strategy';
import { UserModule } from 'src/user/user.module';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';
import { MemberStrategy } from './guard/jwt.member.strategy';
import { RefreshStrategy } from './guard/refresh.strategy';
import { GuestGuardStrategy } from './guard/jwt.guest.strategy';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.access_secret,
      signOptions: { expiresIn: '999d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    MemberStrategy,
    RefreshStrategy,
    GuestGuardStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
