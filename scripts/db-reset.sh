#!/usr/bin/env bash
# 把本地库重置成与仓库种子一致的演示数据。
# 在仓库根目录执行：./scripts/db-reset.sh
# 输入：--yes 跳过确认（非交互必须带上）；--dry-run 只打印步骤。
# 前置：pnpm、backend/.env（没有则从 example 写入）、能连上 DATABASE_URL。
# 副作用：应用迁移；TRUNCATE 业务表和认证表后写入 db/seed/001-trial-journey.sql，
# 再跑 pnpm --filter @class/backend seed:auth。演示登录密码仍是 DemoPass123!。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

YES=0
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --yes) YES=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h | --help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
    *)
      echo "未知参数：$arg（可用 --yes / --dry-run）" >&2
      exit 1
      ;;
  esac
done

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf 'dry-run:'
    printf ' %q' "$@"
    printf '\n'
    return
  fi
  "$@"
}

ensure_docker() {
  if docker info >/dev/null 2>&1; then
    return
  fi
  if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "Docker 未运行，请先启动 Docker。" >&2
    exit 1
  fi
  echo "==> 启动 Docker Desktop"
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
  local env_file=backend/.env
  if [[ ! -f "$env_file" ]]; then
    env_file=backend/.env.example
  fi
  grep -Eq '127\.0\.0\.1:55432|localhost:55432' "$env_file"
}

db_exec() {
  (cd db && docker compose exec -T postgres "$@")
}

load_database_url() {
  local line
  line="$(grep -E '^DATABASE_URL=' backend/.env | tail -n 1)"
  if [[ -z "$line" ]]; then
    echo "backend/.env 缺少 DATABASE_URL" >&2
    exit 1
  fi
  DATABASE_URL="${line#DATABASE_URL=}"
  DATABASE_URL="${DATABASE_URL#\"}"
  DATABASE_URL="${DATABASE_URL%\"}"
  DATABASE_URL="${DATABASE_URL#\'}"
  DATABASE_URL="${DATABASE_URL%\'}"
}

if [[ ! -f backend/.env.example ]]; then
  echo "缺少 backend/.env.example" >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "缺少 pnpm。本仓库只用 pnpm 安装依赖。" >&2
  exit 1
fi

if [[ "$YES" -ne 1 && "$DRY_RUN" -ne 1 ]]; then
  if [[ ! -t 0 ]]; then
    echo "非交互执行请加上 --yes。" >&2
    exit 1
  fi
  read -r -p "将清空演示库并重新写入种子，继续？[y/N] " answer
  if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
    echo "已取消。"
    exit 0
  fi
fi

if [[ ! -d node_modules ]]; then
  echo "==> 安装依赖"
  run pnpm install
fi

if [[ ! -f backend/.env ]]; then
  echo "==> 写入 backend/.env（已有文件不会覆盖）"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "dry-run: cp backend/.env.example backend/.env"
  else
    cp backend/.env.example backend/.env
    secret="$(openssl rand -hex 32)"
    if [[ "$(uname -s)" == "Darwin" ]]; then
      sed -i '' "s/replace-with-a-long-random-secret/${secret}/" backend/.env
    else
      sed -i "s/replace-with-a-long-random-secret/${secret}/" backend/.env
    fi
  fi
fi

if uses_compose_postgres; then
  if [[ "$DRY_RUN" -ne 1 ]]; then
    ensure_docker
  fi
  echo "==> 启动 Postgres"
  run docker compose -f db/docker-compose.yml up -d
  if [[ "$DRY_RUN" -ne 1 ]]; then
    for _ in $(seq 1 40); do
      if db_exec pg_isready -U postgres -d class >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done
    db_exec pg_isready -U postgres -d class >/dev/null
  fi
else
  echo "==> 使用 backend/.env 中的数据库，跳过 Docker Postgres"
fi

echo "==> 生成 Prisma client 并应用迁移"
run pnpm --filter @class/backend prisma:generate
run pnpm --filter @class/backend prisma:deploy

echo "==> 写入旅程种子"
if uses_compose_postgres; then
  run db_exec psql -U postgres -d class -v ON_ERROR_STOP=1 -f /db/seed/001-trial-journey.sql
else
  load_database_url
  if ! command -v psql >/dev/null 2>&1; then
    echo "非 Docker 库需要本机 psql。" >&2
    exit 1
  fi
  run psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/db/seed/001-trial-journey.sql"
fi

if [[ ! -f backend/dist/src/auth/demo-staff.js || ! -f backend/dist/src/prisma-client.js ]]; then
  echo "==> 编译后端（seed:auth 读取 dist）"
  run pnpm --filter @class/backend build
fi

echo "==> 写入 Better Auth 登录哈希"
run pnpm --filter @class/backend seed:auth

echo
echo "演示库已重置。登录密码见 db/README.md。"
