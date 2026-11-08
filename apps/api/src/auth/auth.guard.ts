import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ApiError } from '../common/api-error.js';
import type { Role } from '../generated/prisma/client.js';
import { IS_PUBLIC, ROLES } from './decorators.js';
import {
  notLoggedIn,
  SESSION_COOKIE,
  type SessionRequest,
  type SessionTokenPayload,
  type SessionUser,
} from './session.js';

// One guard for session and role: the role check must always run after the session check.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService
  ) {}

  async canActivate(context: ExecutionContext) {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC, targets)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<SessionRequest>();
    const user = await this.readSession(request);
    request.user = user;

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
    if (roles && !roles.includes(user.role)) {
      throw new ApiError(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'You are not allowed to do this');
    }
    return true;
  }

  private async readSession(request: SessionRequest): Promise<SessionUser> {
    const token: unknown = request.cookies[SESSION_COOKIE];
    if (typeof token !== 'string') {
      throw notLoggedIn();
    }
    try {
      const payload = await this.jwt.verifyAsync<SessionTokenPayload>(token);
      return { id: payload.sub, role: payload.role };
    } catch {
      throw notLoggedIn();
    }
  }
}
