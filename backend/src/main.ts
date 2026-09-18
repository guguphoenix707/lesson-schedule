import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app-module';
import { authTrustedOrigins } from './auth/trusted-origins';
import { env } from './env';
import { resolveFrontendDistPath } from './frontend-dist-path';
import { SpaNotFoundFilter } from './spa-not-found-filter';

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
    origin: authTrustedOrigins(
      env.frontendOrigin,
      env.betterAuthUrl,
      env.railwayPublicOrigin,
    ),
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

  const frontendDistPath = resolveFrontendDistPath();
  let frontendIndex: string | undefined;

  if (frontendDistPath) {
    frontendIndex = readFileSync(
      path.join(frontendDistPath, 'index.html'),
      'utf8',
    );
    app.useStaticAssets({
      root: frontendDistPath,
      wildcard: false,
    });
    app.useGlobalFilters(new SpaNotFoundFilter(frontendIndex));
  } else if (env.isProduction) {
    throw new Error(
      'Frontend build not found. Production must include frontend/dist so GET / can serve the app.',
    );
  }

  await app.listen(env.port, env.host);
}

void bootstrap();
