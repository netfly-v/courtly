import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { SessionRequest } from './session.js';

export const IS_PUBLIC = 'isPublic';

// Every route needs a session by default; this opts one route or controller out.
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<SessionRequest>().user
);
