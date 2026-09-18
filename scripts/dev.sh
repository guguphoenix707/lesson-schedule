#!/usr/bin/env bash
# 本地开发一键启动：已有 Postgres 只拉起容器，再开 API 与前端热更新。
# 在仓库根目录执行：./scripts/dev.sh
# 停：在这个终端按 Ctrl+C（只停本次拉起的进程；已在跑的服务不会被杀）。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CHILDREN=()
CHILD_NAMES=()
ENV_TMP=""
DATABASE_URL_VALUE=""

cleanup() {
  local pid
  for pid in "${CHILDREN[@]+"${CHILDREN[@]}"}"; do
    kill "$pid" 2>/dev/null || true
  done
  for pid in "${CHILDREN[@]+"${CHILDREN[@]}"}"; do
    wait "$pid" 2>/dev/null || true
  done
  if [[ -n "$ENV_TMP" && -f "$ENV_TMP" ]]; then
    rm -f -- "$ENV_TMP"
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

require_command() {
  local command_name="$1"
  local error_message="$2"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "$error_message" >&2
    exit 1
  fi
}

read_env_value() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" backend/.env | tail -n 1 || true)"
  if [[ -z "$line" ]]; then
    return 1
  fi
  line="${line#*=}"
  line="${line#\"}"
  line="${line%\"}"
  line="${line#\'}"
  line="${line%\'}"
  printf '%s\n' "$line"
}

initialize_env() {
  local secret
  if [[ -f backend/.env ]]; then
    return
  fi

  require_command openssl "缺少 openssl，无法生成 BETTER_AUTH_SECRET。请安装后重试。"
  require_command mktemp "缺少 mktemp，无法安全创建 backend/.env。"
  require_command sed "缺少 sed，无法初始化 backend/.env。"

  echo "==> 写入 backend/.env（已有文件不会覆盖）"
  ENV_TMP="$(mktemp backend/.env.tmp.XXXXXX)"
  cp backend/.env.example "$ENV_TMP"
  chmod 600 "$ENV_TMP"
  secret="$(openssl rand -hex 32)"
  if [[ "$(uname -s)" == "Darwin" ]]; then
    sed -i '' "s/replace-with-a-long-random-secret/${secret}/" "$ENV_TMP"
  else
    sed -i "s/replace-with-a-long-random-secret/${secret}/" "$ENV_TMP"
  fi
  if grep -q 'replace-with-a-long-random-secret' "$ENV_TMP"; then
    echo "backend/.env.example 缺少预期的 BETTER_AUTH_SECRET 占位值，已停止创建 .env。" >&2
    exit 1
  fi
  mv "$ENV_TMP" backend/.env
  ENV_TMP=""
}

validate_env() {
  local auth_secret
  if ! DATABASE_URL_VALUE="$(read_env_value DATABASE_URL)" || [[ -z "$DATABASE_URL_VALUE" ]]; then
    echo "backend/.env 缺少非空 DATABASE_URL。请参考 backend/.env.example 配置后重试。" >&2
    exit 1
  fi
  if ! auth_secret="$(read_env_value BETTER_AUTH_SECRET)" || [[ -z "$auth_secret" ]]; then
    echo "backend/.env 缺少非空 BETTER_AUTH_SECRET。" >&2
    exit 1
  fi
  if [[ "$auth_secret" == "replace-with-a-long-random-secret" ]]; then
    echo "backend/.env 仍在使用默认 BETTER_AUTH_SECRET。请替换为随机密钥后重试。" >&2
    exit 1
  fi
}

secure_env_file() {
  if ! chmod 600 backend/.env; then
    echo "无法把 backend/.env 权限限制为仅当前用户可读写，请检查文件所有者和权限。" >&2
    exit 1
  fi
}

port_busy() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

show_port_owner() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | sed -n '1,4p' >&2 || true
}

is_expected_backend() {
  curl -fsS --max-time 2 http://127.0.0.1:3000/api/docs-json 2>/dev/null \
    | grep -Eq '"title"[[:space:]]*:[[:space:]]*"Class API"'
}

is_expected_frontend() {
  curl -fsS --max-time 2 http://127.0.0.1:5173 2>/dev/null \
    | grep -Fq 'Class 智慧学生管理系统'
}

ensure_docker() {
  local attempt
  require_command docker "缺少 Docker CLI。请安装 Docker Desktop 或 Docker Engine 后重试。"
  if ! docker compose version >/dev/null 2>&1; then
    echo "Docker Compose 不可用。请安装或启用 docker compose 插件后重试。" >&2
    exit 1
  fi
  if docker info >/dev/null 2>&1; then
    return
  fi
  if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "Docker CLI 已安装，但 daemon 未运行。请启动 Docker 后重试。" >&2
    exit 1
  fi
  require_command open "无法调用 macOS open 命令启动 Docker Desktop。"
  echo "==> 启动 Docker Desktop（冷启动可能要几十秒）"
  if ! open -a Docker; then
    echo "无法启动 Docker Desktop。请确认应用已安装并手动启动。" >&2
    exit 1
  fi
  for ((attempt = 1; attempt <= 60; attempt += 1)); do
    if docker info >/dev/null 2>&1; then
      return
    fi
    sleep 2
  done
  echo "Docker Desktop 已启动，但 daemon 在 120 秒内仍未就绪。请打开 Docker Desktop 查看错误。" >&2
  exit 1
}

uses_compose_postgres() {
  case "$DATABASE_URL_VALUE" in
    *"@127.0.0.1:55432/"* | *"@localhost:55432/"*) return 0 ;;
    *) return 1 ;;
  esac
}

db_exec() {
  (cd db && docker compose exec -T postgres "$@")
}

wait_for_postgres() {
  local attempt
  for ((attempt = 1; attempt <= 40; attempt += 1)); do
    if db_exec pg_isready -U postgres -d class >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done
  echo "Postgres 在 40 秒内未就绪。请运行以下命令查看状态和日志：" >&2
  echo "  docker compose -f db/docker-compose.yml ps" >&2
  echo "  docker compose -f db/docker-compose.yml logs postgres" >&2
  exit 1
}

seed_empty_compose_database() {
  local counts total_count user_count
  if ! counts="$(
      db_exec psql -U postgres -d class -At -F '|' -c "
        SELECT
          (SELECT COUNT(*) FROM users)
          + (SELECT COUNT(*) FROM students)
          + (SELECT COUNT(*) FROM campuses)
          + (SELECT COUNT(*) FROM guardians)
          + (SELECT COUNT(*) FROM student_guardians)
          + (SELECT COUNT(*) FROM courses)
          + (SELECT COUNT(*) FROM classes)
          + (SELECT COUNT(*) FROM class_sessions)
          + (SELECT COUNT(*) FROM trial_cases)
          + (SELECT COUNT(*) FROM session_participants)
          + (SELECT COUNT(*) FROM follow_ups)
          + (SELECT COUNT(*) FROM session)
          + (SELECT COUNT(*) FROM account)
          + (SELECT COUNT(*) FROM verification),
          (SELECT COUNT(*) FROM users);
      "
    )"; then
    echo "无法检查演示库是否为空，已停止自动种子。数据库内容未被重置。" >&2
    exit 1
  fi
  IFS='|' read -r total_count user_count <<<"$counts"

  if [[ "$total_count" == "0" ]]; then
    echo "==> 数据库所有受管表均为空，写入演示种子"
    "$ROOT/scripts/db-reset.sh" --yes
    return
  fi

  if [[ "$user_count" == "0" ]]; then
    echo "数据库已有数据但没有演示用户，已跳过自动种子以避免覆盖数据。" >&2
    echo "如确认要清空并重建演示库，请显式运行：./scripts/db-reset.sh" >&2
  else
    echo "==> 数据库已有数据，跳过自动种子"
  fi
}

wait_for_service() {
  local service_name="$1"
  local pid="$2"
  local check_function="$3"
  local attempt status
  for ((attempt = 1; attempt <= 60; attempt += 1)); do
    if "$check_function"; then
      echo "==> ${service_name}已就绪"
      return
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      if wait "$pid"; then
        status=0
      else
        status=$?
      fi
      echo "${service_name}在就绪前退出（状态码 ${status}），请查看上方日志。" >&2
      return 1
    fi
    sleep 1
  done
  echo "${service_name}启动后 60 秒内未通过健康检查，请查看上方日志。" >&2
  return 1
}

monitor_children() {
  local index pid status
  while true; do
    for index in "${!CHILDREN[@]}"; do
      pid="${CHILDREN[$index]}"
      if ! kill -0 "$pid" 2>/dev/null; then
        if wait "$pid"; then
          status=0
        else
          status=$?
        fi
        echo "${CHILD_NAMES[$index]}已退出（状态码 ${status}），正在停止本次启动的其他服务。" >&2
        if [[ "$status" -eq 0 ]]; then
          return 1
        fi
        return "$status"
      fi
    done
    sleep 1
  done
}

if [[ ! -f backend/.env.example ]]; then
  echo "缺少 backend/.env.example" >&2
  exit 1
fi

require_command pnpm "缺少 pnpm。本仓库只用 pnpm 安装依赖。"
require_command curl "缺少 curl，无法验证本地服务是否正确启动。"
require_command lsof "缺少 lsof，无法检查 3000 / 5173 端口占用。"

if [[ ! -d node_modules ]]; then
  echo "==> 安装依赖"
  if ! pnpm install; then
    echo "pnpm install 失败。请检查网络、pnpm 版本和上方错误后重试。" >&2
    exit 1
  fi
fi

initialize_env
secure_env_file
validate_env

if uses_compose_postgres; then
  ensure_docker
  echo "==> 启动 Postgres（不重建数据）"
  if ! (cd db && docker compose up -d); then
    echo "Postgres 容器启动失败。请检查 Docker 状态以及宿主机 55432 端口是否被占用。" >&2
    exit 1
  fi
  wait_for_postgres
else
  echo "==> 使用已有 backend/.env 中的数据库，跳过 Docker Postgres"
fi

echo "==> 生成 Prisma client 并应用迁移"
if ! pnpm --filter @class/backend prisma:generate; then
  echo "Prisma client 生成失败，请检查依赖和 db/schema.prisma。" >&2
  exit 1
fi
if ! pnpm --filter @class/backend prisma:deploy; then
  echo "数据库迁移失败，请检查 backend/.env 的 DATABASE_URL 和数据库连接。" >&2
  exit 1
fi

if uses_compose_postgres; then
  seed_empty_compose_database
fi

if port_busy 3000; then
  if is_expected_backend; then
    echo "==> 后端已在 3000（已验证 Class API）"
  else
    echo "端口 3000 已被占用，但无法确认是本项目后端：" >&2
    show_port_owner 3000
    echo "请停止该进程后重试，或为后端配置其他端口。" >&2
    exit 1
  fi
else
  echo "==> 启动后端 http://127.0.0.1:3000"
  pnpm --filter @class/backend start:dev &
  CHILDREN+=("$!")
  CHILD_NAMES+=("后端")
  wait_for_service "后端" "$!" is_expected_backend
fi

if port_busy 5173; then
  if is_expected_frontend; then
    echo "==> 前端已在 5173（已验证 Class 页面）"
  else
    echo "端口 5173 已被占用，但无法确认是本项目前端：" >&2
    show_port_owner 5173
    echo "请停止该进程后重试。" >&2
    exit 1
  fi
else
  echo "==> 启动前端 http://127.0.0.1:5173"
  pnpm --filter @class/frontend dev &
  CHILDREN+=("$!")
  CHILD_NAMES+=("前端")
  wait_for_service "前端" "$!" is_expected_frontend
fi

echo
echo "打开 http://127.0.0.1:5173"
echo "接口文档 http://127.0.0.1:3000/api/docs"
echo "停：Ctrl+C"

if [[ ${#CHILDREN[@]} -eq 0 ]]; then
  exit 0
fi
monitor_children
