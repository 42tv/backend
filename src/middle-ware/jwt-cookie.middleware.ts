import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class JwtCookieMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (!req.headers.authorization && req.cookies?.jwt) {
      req.headers.authorization = `Bearer ${req.cookies.jwt}`;
    }
    if (req.originalUrl.includes('/refresh') && req.cookies?.refresh) {
      console.log('refresh');
      req.headers.authorization = `Bearer ${req.cookies.refresh}`;
    }

    next();
  }
}
