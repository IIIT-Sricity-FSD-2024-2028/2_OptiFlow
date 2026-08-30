import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * RouteRequestMiddleware
 * ──────────────────────
 * Router-level middleware scoped specifically to the /users route.
 * Attaches a route processing header to responses for client visibility.
 */
@Injectable()
export class RouteRequestMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    res.setHeader('X-Route-Processed', 'users');
    next();
  }
}
