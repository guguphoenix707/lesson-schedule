import 'reflect-metadata';
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app-module';
import { env } from './env';

const listNetworkInterfaces = os.networkInterfaces.bind(os);
os.networkInterfaces = () => {
  try {
    return listNetworkInterfaces();
  } catch {
    return {};
  }
};

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: env.frontendOrigin,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Class API')
    .setDescription('Student management API')
    .setVersion('0.0.1')
    .addCookieAuth('better-auth.session_token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  if (env.isProduction) {
    const frontendDistPath = path.resolve(process.cwd(), '../frontend/dist');
    const frontendIndexPath = path.join(frontendDistPath, 'index.html');

    if (!existsSync(frontendIndexPath)) {
      throw new Error(`Frontend build not found at ${frontendIndexPath}`);
    }

    const frontendIndex = readFileSync(frontendIndexPath, 'utf8');

    app.useStaticAssets({
      root: frontendDistPath,
      wildcard: false,
    });

    const fastify = app.getHttpAdapter().getInstance();
    fastify.setNotFoundHandler((request, reply) => {
      const acceptsHtml =
        request.headers.accept?.includes('text/html') ?? false;
      const isApiRequest =
        request.url === '/api' || request.url.startsWith('/api/');

      if (!isApiRequest && acceptsHtml) {
        return reply.type('text/html; charset=utf-8').send(frontendIndex);
      }

      return reply.code(404).send({
        message: 'Not Found',
        error: 'Not Found',
        statusCode: 404,
      });
    });
  }

  await app.listen(env.port, env.host);
}

void bootstrap();
