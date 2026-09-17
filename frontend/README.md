# Frontend

本目录负责用户界面、客户端交互、展示逻辑和客户端侧适配。

## 当前选型

已确认并安装（pnpm workspace `@class/frontend`）：

- React 19 + TypeScript + Vite
- React Router DOM 7
- TanStack Query 5
- Ant Design 6.6.4
- axios（`src/api/http-base.ts` 为唯一 HTTP 入口）
- CASL（`@casl/ability`、`@casl/react`）
- lodash-es（与现有 ESLint 规则一致，禁止原生 `list.map` 等）

本期不引入 Next.js。

## 边界

- 不承载服务端权限、持久化或只能在可信环境执行的业务规则。
- 不保存密钥或真实环境配置。
- 与服务端交互依赖明确、可版本化的契约，不复制服务端内部实现。

## 约定结构

- `src/`：实现代码。
- `src/api/http-base.ts`：axios 实例，浏览器请求的唯一入口；业务模块只通过它访问 `/api`。
- `src/api/auth.ts`：Better Auth 登录、退出和当前会话。不是业务资源。
- `src/auth/ability.ts`：根据会话角色生成 CASL，只用于界面展示或禁用。
- `tests/`：无法就近放置的集成或端到端测试。
- `design/`：本模块的架构、交互和编码约定。

组件按使用范围放置：仅本页使用的放在对应页面目录的 `components/` 下；跨页面公用的才放入全局 `src/components/`。不要为“以后可能复用”提前提升到全局。文件名必须 kebab-case，见 `docs/code-conventions.md`。细节见 `design/rule.md`。

## 验证命令

在仓库根目录：

```bash
pnpm install
pnpm --filter @class/frontend lint
pnpm --filter @class/frontend dev
pnpm --filter @class/frontend build
```

开发服务器默认 `http://localhost:5173`，并把 `/api` 代理到 `http://localhost:3000`，以便登录 Cookie 与页面同源。登录页 `/login`；管理员登录后进入 `/trial-tasklist`，教师进入 `/`。当前登录身份读 `GET /api/auth/get-session`。公开接口走 `/api/common`；业务资源走 REST 路径（如 `/api/students/:studentId`），401 表示未登录，403 表示角色不够。不调用业务 `/me`。

演示账号与密码见 `db/README.md`。

修改实现前先阅读 `design/rule.md`。试听界面范围以 [试听管理产品功能清单（V1）](../docs/trial-product-features-v1.md) 为准；数据关系见 [试听切片数据关系 v2](../docs/trial-slice-data-relations-v2.md)。地址表见 [`docs/README.md`](../docs/README.md#设计来源)。

涉及 Ant Design 时，还需阅读仓库 `.agents/skills/antd/SKILL.md`，并在写组件前使用 `antd` MCP 核对 6.6.4 对应的 API 和示例。
