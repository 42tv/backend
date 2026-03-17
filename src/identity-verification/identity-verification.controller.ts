import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';
import { IdentityVerificationService } from './identity-verification.service';
import { ConfirmPhoneVerificationDto } from './dto/confirm-phone-verification.dto';

@Controller('identity-verification')
export class IdentityVerificationController {
  constructor(
    private readonly identityVerificationService: IdentityVerificationService,
  ) {}

  @Post('phone/start')
  @UseGuards(MemberGuard)
  async startPhoneVerification(@Request() req) {
    return this.identityVerificationService.startPhoneVerification(req.user.idx);
  }

  @Post('phone/confirm')
  @UseGuards(MemberGuard)
  async confirmPhoneVerification(
    @Request() req,
    @Body() dto: ConfirmPhoneVerificationDto,
  ) {
    return this.identityVerificationService.confirmPhoneVerification(
      req.user.idx,
      dto,
    );
  }
}
