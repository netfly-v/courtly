import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { isUUID } from 'class-validator';
import { ApiError } from '../common/api-error.js';
import type { Role } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
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
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService
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
    const userId = await this.readUserId(request);
    // A token can outlive its user: `docker compose down -v` recreates the users.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) {
      throw notLoggedIn();
    }
    return user;
  }

  private async readUserId(request: SessionRequest) {
    const token: unknown = request.cookies[SESSION_COOKIE];
    if (typeof token !== 'string') {
      throw notLoggedIn();
    }
    const payload = await this.jwt
      .verifyAsync<Partial<SessionTokenPayload>>(token)
      .catch(() => undefined);
    // A signed token with an id that is not a UUID would make the user lookup fail with a 500.
    if (typeof payload?.sub !== 'string' || !isUUID(payload.sub)) {
      throw notLoggedIn();
    }
    return payload.sub;
  }
}
