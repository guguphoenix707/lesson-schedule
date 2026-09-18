import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { env } from '../env';
import { prisma } from '../prisma-client';
import { authTrustedOrigins } from './trusted-origins';

export const auth = betterAuth({
  baseURL: env.betterAuthUrl,
  basePath: '/api/auth',
  secret: env.betterAuthSecret,
  trustedOrigins: authTrustedOrigins(
    env.frontendOrigin,
    env.betterAuthUrl,
    env.railwayPublicOrigin,
  ),
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  user: {
    modelName: 'user',
    fields: {
      name: 'displayName',
    },
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        input: false,
      },
    },
  },
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: env.isProduction ? 'none' : 'lax',
      secure: env.isProduction,
      partitioned: env.isProduction,
      path: '/',
    },
  },
});
