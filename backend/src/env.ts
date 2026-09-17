import 'dotenv/config';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export const env = {
  get databaseUrl() {
    return requiredEnv('DATABASE_URL');
  },
  get betterAuthSecret() {
    return requiredEnv('BETTER_AUTH_SECRET');
  },
  get betterAuthUrl() {
    return process.env.BETTER_AUTH_URL ?? 'http://localhost:5173';
  },
  get frontendOrigin() {
    return process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
  },
  get port() {
    return Number(process.env.PORT ?? 3000);
  },
};
