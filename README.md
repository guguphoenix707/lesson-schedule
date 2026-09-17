# Project

学生管理系统。目录按 frontend / backend / db 分责；技术栈已选定并安装依赖。

## 快速导航

- 项目协作与 AI 约束：[`AGENTS.md`](AGENTS.md)
- 项目结构：[`docs/project-structure.md`](docs/project-structure.md)
- 通用代码规范：[`docs/code-conventions.md`](docs/code-conventions.md)
- 作业资料：[`docs/技术作业.html`](docs/技术作业.html)
- 前端：[`frontend/README.md`](frontend/README.md)
- 后端：[`backend/README.md`](backend/README.md)
- 数据：[`db/README.md`](db/README.md)

## 当前技术栈

- 前端：Vite + React + TypeScript、React Router、TanStack Query、Ant Design
- 后端：NestJS（Fastify）+ Better Auth + CASL + Swagger
- 数据库：PostgreSQL + Prisma 7

## 安装与运行

```bash
pnpm install
cp backend/.env.example backend/.env
pnpm dev:frontend
pnpm dev:backend
```

前端默认 `http://localhost:5173`，后端 `http://localhost:3000`，Swagger `http://localhost:3000/api/docs`。
