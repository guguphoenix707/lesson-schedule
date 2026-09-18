import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

function requestPath(request: FastifyRequest): string {
  return request.url.split('?')[0] ?? request.url;
}

export function shouldServeSpa(request: FastifyRequest): boolean {
  const isPageRequest = request.method === 'GET' || request.method === 'HEAD';
  const path = requestPath(request);
  const isApiRequest = path === '/api' || path.startsWith('/api/');
  const accept = request.headers.accept ?? '';
  const wantsJson =
    accept.includes('application/json') && !accept.includes('text/html');

  return isPageRequest && !isApiRequest && !wantsJson;
}

@Catch(NotFoundException)
export class SpaNotFoundFilter implements ExceptionFilter {
  constructor(private readonly frontendIndex: string) {}

  catch(exception: NotFoundException, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();

    if (shouldServeSpa(request)) {
      return reply.type('text/html; charset=utf-8').send(this.frontendIndex);
    }

    return reply.code(exception.getStatus()).send(exception.getResponse());
  }
}
