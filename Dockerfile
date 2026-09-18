FROM node:22-bookworm-slim AS build

WORKDIR /app

ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/class

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json

RUN pnpm install --frozen-lockfile

COPY frontend frontend
COPY backend backend
COPY db db

RUN pnpm --filter @class/backend prisma:generate \
  && pnpm --filter @class/frontend build \
  && pnpm --filter @class/backend build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

COPY --from=build /app /app

EXPOSE 3000

CMD ["/bin/sh", "-c", "pnpm --filter @class/backend prisma:deploy && pnpm --filter @class/backend seed:demo-if-empty && exec pnpm --filter @class/backend start:prod"]
