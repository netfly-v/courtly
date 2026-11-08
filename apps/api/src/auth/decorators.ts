import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '../generated/prisma/client.js';
import type { SessionRequest } from './session.js';

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';

export const Public = () => SetMetadata(IS_PUBLIC, true);

export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<SessionRequest>().user
);
