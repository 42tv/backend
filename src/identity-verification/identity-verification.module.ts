import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { IdentityProviderFactory } from './identity-provider.factory';
import { IdentityVerificationService } from './identity-verification.service';
import { DevIdentityProvider } from './providers/dev-identity.provider';
import { LivePgIdentityProvider } from './providers/live-pg-identity.provider';
import { UserModule } from 'src/user/user.module';
import { IdentityVerificationController } from './identity-verification.controller';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: 600 },
      }),
    }),
    UserModule,
  ],
  controllers: [IdentityVerificationController],
  providers: [
    IdentityProviderFactory,
    IdentityVerificationService,
    DevIdentityProvider,
    LivePgIdentityProvider,
  ],
  exports: [IdentityVerificationService, IdentityProviderFactory],
})
export class IdentityVerificationModule {}
