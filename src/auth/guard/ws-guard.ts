import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Observable } from 'rxjs';
import { AuthService } from '../auth.service';

@Injectable()
export class WsGuard implements CanActivate {
  constructor(private authService: AuthService) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const client = context.switchToWs().getClient();
    try {
      const token = client.handshake.auth.token.split(' ')[1];
      const paylaod = this.authService.validate(token);
      client.user = paylaod;
      console.log(`payload = `, paylaod);
      return true;
    } catch (e) {
      console.log(e);
      throw new WsException('Invalid credentials');
    }
  }
}
