import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * NCP 콜백 인증 가드.
 * NCP Live Station 콜백은 검증 헤더/서명을 제공하지 않으므로,
 * 등록한 콜백 URL 의 쿼리 시크릿(?secret=)을 NCP_CALLBACK_SECRET 과 대조한다.
 * (IVS 의 WebhookGuard 가 x-webhook-token 헤더를 쓰던 것을 쿼리 방식으로 대체)
 */
@Injectable()
export class NcpWebhookGuard implements CanActivate {
  private readonly logger = new Logger(NcpWebhookGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();
    const secret = request.query.secret as string;

    if (!secret || secret !== process.env.NCP_CALLBACK_SECRET) {
      this.logger.warn('유효하지 않은 NCP 콜백 시크릿 요청');
      throw new UnauthorizedException('유효하지 않은 콜백 시크릿입니다.');
    }

    return true;
  }
}
