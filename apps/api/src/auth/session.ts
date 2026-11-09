import { HttpStatus } from '@nestjs/common';
import type { CookieOptions, Request } from 'express';
import { ApiError } from '../common/api-error.js';
import type { Role } from '../generated/prisma/client.js';

export const SESSION_COOKIE = 'courtly_session';
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface SessionTokenPayload {
  sub: string;
}

export interface SessionUser {
  id: string;
  role: Role;
}

export interface SessionRequest extends Request {
  user?: SessionUser;
}

export const sessionCookieOptions = (secure: boolean): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure,
  path: '/',
  maxAge: SESSION_TTL_SECONDS * 1000,
});

export const notLoggedIn = () =>
  new ApiError(HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', 'Please log in');
