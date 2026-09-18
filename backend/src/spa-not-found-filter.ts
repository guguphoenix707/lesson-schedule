import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Catch(NotFoundException)
export class SpaNotFoundFilter implements ExceptionFilter {
  constructor(private readonly frontendIndex: string) {}

  catch(exception: NotFoundException, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();
    const acceptsHtml = request.headers.accept?.includes('text/html') ?? false;
    const isApiRequest =
      request.url === '/api' || request.url.startsWith('/api/');
    const isPageRequest = request.method === 'GET' || request.method === 'HEAD';

    if (isPageRequest && !isApiRequest && acceptsHtml) {
      return reply.type('text/html; charset=utf-8').send(this.frontendIndex);
    }

    return reply.code(exception.getStatus()).send(exception.getResponse());
  }
}
