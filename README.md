# Project

学生管理系统。目录按 frontend / backend / db 分责；技术栈已选定并安装依赖。

## 快速导航

- 项目协作与 AI 约束：[`AGENTS.md`](AGENTS.md)
- 项目结构：[`docs/project-structure.md`](docs/project-structure.md)
- 通用代码规范：[`docs/code-conventions.md`](docs/code-conventions.md)
- 作业设计文档：[`DESIGN.md`](DESIGN.md)
- 作业资料：[`docs/技术作业.html`](docs/技术作业.html)
- 试听数据关系：[`docs/trial-slice-data-relations-v2.md`](docs/trial-slice-data-relations-v2.md)
- 试听产品功能清单：[`docs/trial-product-features-v1.md`](docs/trial-product-features-v1.md)
- 设计来源（含飞书原文）：[`docs/README.md`](docs/README.md#设计来源)
- 前端：[`frontend/README.md`](frontend/README.md)
- 后端：[`backend/README.md`](backend/README.md)
- 数据：[`db/README.md`](db/README.md)

## 当前技术栈

- 前端：Vite + React + TypeScript、React Router、TanStack Query、Ant Design、axios
- 后端：NestJS（Fastify）+ Better Auth + CASL + Swagger
- 数据库：PostgreSQL + Prisma 7

## 安装与运行

```bash
./scripts/dev.sh
```

需要 Docker。没有 `backend/.env` 时会从 example 写入，并拉起 `db/docker-compose.yml` 的 Postgres（宿主机端口 `55432`）。空库会执行迁移和演示种子。Ctrl+C 只停止本次拉起的进程。

也可以拆开跑：

```bash
pnpm install
cp backend/.env.example backend/.env
pnpm dev:frontend
pnpm dev:backend
```

前端默认 `http://localhost:5173`，后端 `http://localhost:3000`，Swagger `http://localhost:3000/api/docs`。登录前先按 `db/README.md` 准备数据库和演示账号；演示密码与邮箱也写在该文件。

## 持续集成

推送到 `main` 或打开 Pull Request 时，GitHub Actions 会安装依赖并运行 `pnpm check`：前端 lint/build，以及后端 Prisma client 生成和 build。本地同样执行：

```bash
pnpm check
```

`prisma generate` 需要 `DATABASE_URL`。CI 使用占位连接串，不连接真实数据库；本地会读取 `backend/.env`。

## Railway 部署

Railway 的 Root Directory 必须是仓库根目录，不要设成 `backend/`。构建用根目录 `Dockerfile`（`railway.json` 固定为 Dockerfile builder）。发布前先按与 `db/docker-compose.yml` 相同的节奏等待 Postgres（3 秒间隔、最多 20 次），再跑迁移和空库种子；进程起来后只执行 `node dist/src/main.js`。健康检查为公开接口 `GET /api/common/health`。

公开地址要能打开前端，服务必须构建并带上 `frontend/dist`（根目录 `Dockerfile`，或 Nixpacks 跑根目录 `pnpm build` / `pnpm start`）。把 `BETTER_AUTH_URL` 和 `FRONTEND_ORIGIN` 设成该 Railway HTTPS 域名；未设置时回退 `RAILWAY_PUBLIC_DOMAIN`。若这两项仍只指向 GitHub Pages，页面可以打开，但登录 Origin 校验会失败。
