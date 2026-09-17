#!/usr/bin/env bash
# 本地开发一键启动：已有 Postgres 只拉起容器，再开 API 与前端热更新。
# 在仓库根目录执行：./scripts/dev.sh
# 停：在这个终端按 Ctrl+C（只停本次拉起的进程；已在跑的服务不会被杀）。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CHILDREN=()

cleanup() {
  for pid in "${CHILDREN[@]+"${CHILDREN[@]}"}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

port_busy() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

ensure_docker() {
  if docker info >/dev/null 2>&1; then
    return
  fi
  if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "Docker 未运行，请先启动 Docker。" >&2
    exit 1
  fi
  echo "==> 启动 Docker Desktop（冷启动可能要几十秒，之后会很快）"
  open -a Docker
  for _ in $(seq 1 60); do
    if docker info >/dev/null 2>&1; then
      return
    fi
    sleep 2
  done
  echo "Docker 仍未就绪。" >&2
  exit 1
}

uses_compose_postgres() {
  grep -Eq '127\.0\.0\.1:55432|localhost:55432' backend/.env
}

db_exec() {
  (cd db && docker compose exec -T postgres "$@")
}

if [[ ! -f backend/.env.example ]]; then
  echo "缺少 backend/.env.example" >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "缺少 pnpm。本仓库只用 pnpm 安装依赖。" >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "==> 安装依赖"
  pnpm install
fi

if [[ ! -f backend/.env ]]; then
  echo "==> 写入 backend/.env（已有文件不会覆盖）"
  cp backend/.env.example backend/.env
  secret="$(openssl rand -hex 32)"
  if [[ "$(uname -s)" == "Darwin" ]]; then
    sed -i '' "s/replace-with-a-long-random-secret/${secret}/" backend/.env
  else
    sed -i "s/replace-with-a-long-random-secret/${secret}/" backend/.env
  fi
fi

if uses_compose_postgres; then
  ensure_docker
  echo "==> 启动 Postgres（不重建数据）"
  (cd db && docker compose up -d)
  for _ in $(seq 1 40); do
    if db_exec pg_isready -U postgres -d class >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  db_exec pg_isready -U postgres -d class >/dev/null
else
  echo "==> 使用已有 backend/.env 中的数据库，跳过 Docker Postgres"
fi

echo "==> 生成 Prisma client 并应用迁移"
pnpm --filter @class/backend prisma:generate
pnpm --filter @class/backend prisma:deploy

if uses_compose_postgres; then
  user_count="$(
    db_exec psql -U postgres -d class -tAc "SELECT COUNT(*) FROM users" | tr -d '[:space:]'
  )"
  if [[ "${user_count}" == "0" ]]; then
    echo "==> 库是空的，执行一次种子（以后不用再跑）"
    "$ROOT/scripts/db-reset.sh" --yes
  fi
fi

if port_busy 3000; then
  echo "==> 后端已在 3000"
else
  echo "==> 启动后端 http://127.0.0.1:3000"
  pnpm --filter @class/backend start:dev &
  CHILDREN+=("$!")
fi

if port_busy 5173; then
  echo "==> 前端已在 5173"
else
  echo "==> 启动前端 http://127.0.0.1:5173"
  pnpm --filter @class/frontend dev &
  CHILDREN+=("$!")
fi

echo
echo "打开 http://127.0.0.1:5173"
echo "接口文档 http://127.0.0.1:3000/api/docs"
echo "停：Ctrl+C"

if [[ ${#CHILDREN[@]} -eq 0 ]]; then
  trap - EXIT INT TERM
  exit 0
fi
wait "${CHILDREN[@]}"
