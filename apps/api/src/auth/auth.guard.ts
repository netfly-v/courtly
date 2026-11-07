import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC } from './decorators.js';
import {
  notLoggedIn,
  SESSION_COOKIE,
  type SessionRequest,
  type SessionTokenPayload,
} from './session.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<SessionRequest>();
    const token: unknown = request.cookies[SESSION_COOKIE];
    if (typeof token !== 'string') {
      throw notLoggedIn();
    }
    try {
      const payload = await this.jwt.verifyAsync<SessionTokenPayload>(token);
      request.user = { id: payload.sub };
    } catch {
      throw notLoggedIn();
    }
    return true;
  }
}
