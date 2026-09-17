import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyRequest } from 'fastify';
import { auth } from './auth';
import { IS_PUBLIC_KEY, isPublicApiPath } from './is-public';

export type AuthenticatedUser = {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'teacher';
};

type RequestWithUser = FastifyRequest & {
  user?: AuthenticatedUser;
};

function isStaffRole(value: unknown): value is 'admin' | 'teacher' {
  return value === 'admin' || value === 'teacher';
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic || isPublicApiPath(request.url)) {
      return true;
    }

    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      throw new UnauthorizedException();
    }

    const { user } = session;
    if (!isStaffRole(user.role)) {
      throw new ForbiddenException();
    }

    request.user = {
      id: user.id,
      email: user.email,
      displayName: user.name,
      role: user.role,
    };
    return true;
  }
}
