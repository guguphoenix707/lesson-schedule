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
  get deepseekApiKey() {
    const value = process.env.DEEPSEEK_API_KEY?.trim();
    return value && value.length > 0 ? value : undefined;
  },
  get deepseekModel() {
    const value = process.env.DEEPSEEK_MODEL?.trim();
    return value && value.length > 0 ? value : 'deepseek-v4-pro';
  },
  get deepseekBaseUrl() {
    const value = process.env.DEEPSEEK_BASE_URL?.trim();
    const baseUrl =
      value && value.length > 0 ? value : 'https://api.deepseek.com';
    return baseUrl.replace(/\/+$/, '');
  },
};
