import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class JwtCookieMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const path = req.originalUrl.split('?')[0];

    if (!req.headers.authorization && req.cookies?.jwt) {
      req.headers.authorization = `Bearer ${req.cookies.jwt}`;
    }
    if (path.endsWith('/auth/refresh') && req.cookies?.refresh) {
      req.headers.authorization = `Bearer ${req.cookies.refresh}`;
    }

    next();
  }
}
