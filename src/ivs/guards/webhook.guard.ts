import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class WebhookGuard implements CanActivate {
  private readonly logger = new Logger(WebhookGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();
    const token = request.headers['x-webhook-token'] as string;

    // 토큰 존재 여부 검증
    if (!token) {
      this.logger.warn('웹훅 토큰이 누락된 요청 시도');
      throw new UnauthorizedException('웹훅 토큰이 누락되었습니다.');
    }

    // 토큰 일치 여부 검증
    if (token !== process.env.AWS_WEBHOOK_SECRET_TOKEN) {
      this.logger.warn(`잘못된 웹훅 토큰 시도: ${token}`);
      throw new UnauthorizedException('유효하지 않은 웹훅 토큰입니다.');
    }

    return true;
  }
}
