import { HttpStatus } from '@nestjs/common';
import type { CookieOptions, Request } from 'express';
import { ApiError } from '../common/api-error.js';

export const SESSION_COOKIE = 'courtly_session';
export const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours

export interface SessionTokenPayload {
  sub: string;
}

export interface SessionUser {
  id: string;
}

export interface SessionRequest extends Request {
  user?: SessionUser;
}

export const sessionCookieOptions = (secure: boolean): CookieOptions => ({
  // JavaScript can't read the cookie, so an XSS bug can't steal the session.
  httpOnly: true,
  // Not sent with cross-site POSTs: basic CSRF protection.
  sameSite: 'lax',
  secure,
  path: '/',
  maxAge: SESSION_TTL_SECONDS * 1000,
});

export const notLoggedIn = () =>
  new ApiError(HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', 'Please log in');
