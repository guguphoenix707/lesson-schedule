import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyRequest } from 'fastify';
import { auth } from './auth';

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
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      throw new UnauthorizedException();
    }

    const { user } = session;
    if (!isStaffRole(user.role)) {
      throw new UnauthorizedException();
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
