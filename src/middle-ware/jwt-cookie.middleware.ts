import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class JwtCookieMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log('AA');
    if (!req.headers.authorization && req.cookies?.jwt) {
      console.log('authorization헤더 없고 jwt 쿠키 있음');
      req.headers.authorization = `Bearer ${req.cookies.jwt}`;
    }
    next();
  }
}
