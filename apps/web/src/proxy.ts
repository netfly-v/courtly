import { type NextRequest, NextResponse } from 'next/server';

// Must match SESSION_COOKIE in apps/api/src/auth/session.ts.
const SESSION_COOKIE = 'courtly_session';

export const proxy = (request: NextRequest) =>
  request.cookies.has(SESSION_COOKIE)
    ? NextResponse.next()
    : NextResponse.redirect(new URL('/login', request.url));

export const config = {
  matcher: ['/((?!api|_next|icon.svg|login).*)'],
};
