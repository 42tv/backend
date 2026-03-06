import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IdentityProviderFactory } from './identity-provider.factory';
import { IdentityVerificationService } from './identity-verification.service';
import { DevIdentityProvider } from './providers/dev-identity.provider';
import { LivePgIdentityProvider } from './providers/live-pg-identity.provider';
import { UserModule } from 'src/user/user.module';
import { IdentityVerificationController } from './identity-verification.controller';

@Module({
  imports: [ConfigModule, UserModule],
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
