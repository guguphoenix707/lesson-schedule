import { Module, type OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { auth } from './auth';
import { MeController } from './me-controller';

function firstHeader(
  value: string | string[] | undefined,
  fallback: string,
): string {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }
  return value ?? fallback;
}

async function handleAuthRequest(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const protocol = firstHeader(
    request.headers['x-forwarded-proto'],
    request.protocol || 'http',
  );
  const host = firstHeader(
    request.headers['x-forwarded-host'],
    firstHeader(request.headers.host, 'localhost:3000'),
  );
  const url = new URL(request.url, `${protocol}://${host}`);
  const headers = fromNodeHeaders(request.headers);
  const method = request.method;
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body =
    hasBody && request.body !== undefined && request.body !== null
      ? typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body)
      : undefined;

  if (body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await auth.handler(
    new Request(url, {
      method,
      headers,
      body,
    }),
  );

  reply.status(response.status);
  const setCookies = response.headers.getSetCookie();
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      return;
    }
    void reply.header(key, value);
  });
  if (setCookies.length > 0) {
    void reply.header('set-cookie', setCookies);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    return reply.send();
  }
  return reply.send(buffer);
}

@Module({
  controllers: [MeController],
})
export class AuthModule implements OnModuleInit {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  onModuleInit() {
    const fastify = this.httpAdapterHost.httpAdapter.getInstance() as FastifyInstance;
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

    fastify.route({
      method: [...methods],
      url: '/api/auth/*',
      handler: handleAuthRequest,
    });
    fastify.route({
      method: [...methods],
      url: '/api/auth',
      handler: handleAuthRequest,
    });
  }
}
