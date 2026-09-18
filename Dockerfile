FROM node:22-bookworm-slim AS build

WORKDIR /app

ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/class
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@11.7.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
COPY backend/prisma.config.ts backend/prisma.config.ts
COPY db db

RUN pnpm install --frozen-lockfile

COPY frontend frontend
COPY backend backend

RUN pnpm --filter @class/backend prisma:generate \
  && pnpm --filter @class/frontend build \
  && pnpm --filter @class/backend build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@11.7.0 --activate

COPY --from=build /app /app

EXPOSE 3000

WORKDIR /app/backend

CMD ["/bin/sh", "-c", "node scripts/wait-for-postgres.mjs && ./node_modules/.bin/prisma migrate deploy && node scripts/seed-demo-if-empty.mjs && exec node dist/src/main.js"]
