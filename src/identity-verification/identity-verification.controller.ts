import { Controller, Post, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';
import { IdentityVerificationService } from './identity-verification.service';

@ApiTags('Identity Verification - 본인인증 API')
@Controller('identity-verification')
export class IdentityVerificationController {
  constructor(
    private readonly identityVerificationService: IdentityVerificationService,
  ) {}

  @Post('phone')
  @ApiOperation({
    summary: '휴대폰 본인인증 완료 처리',
    description: '인증된 회원의 휴대폰 본인인증 완료 상태를 반영합니다.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: '본인인증 성공',
  })
  @ApiResponse({
    status: 401,
    description: '인증되지 않은 사용자',
  })
  @UseGuards(MemberGuard)
  async verifyPhone(@Request() req): Promise<SuccessResponseDto<null>> {
    await this.identityVerificationService.verifyPhone(req.user);
    return ResponseWrapper.success(null, '휴대폰 본인 인증이 완료되었습니다.');
  }
}
