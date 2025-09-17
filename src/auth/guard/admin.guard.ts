import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminGuard extends AuthGuard('jwt') implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = await super.canActivate(context);
    if (!authenticated) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    console.log('AdminGuard - user:', user);

    if (!user || !user.is_admin) {
      throw new UnauthorizedException('관리자 권한이 필요합니다.');
    }

    return true;
  }
}
