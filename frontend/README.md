# Frontend

本目录负责用户界面、客户端交互、展示逻辑和客户端侧适配。

## 当前选型

已确认并安装（pnpm workspace `@class/frontend`）：

- React 19 + TypeScript + Vite
- React Router DOM 7
- TanStack Query 5
- Ant Design 6.6.4
- CASL（`@casl/ability`、`@casl/react`）
- lodash-es（与现有 ESLint 规则一致，禁止原生 `list.map` 等）

本期不引入 Next.js。

## 边界

- 不承载服务端权限、持久化或只能在可信环境执行的业务规则。
- 不保存密钥或真实环境配置。
- 与服务端交互依赖明确、可版本化的契约，不复制服务端内部实现。

## 约定结构

- `src/`：实现代码。
- `tests/`：无法就近放置的集成或端到端测试。
- `design/`：本模块的架构、交互和编码约定。

## 验证命令

在仓库根目录：

```bash
pnpm install
pnpm --filter @class/frontend lint
pnpm --filter @class/frontend dev
pnpm --filter @class/frontend build
```

修改实现前先阅读 `design/rule.md`。

涉及 Ant Design 时，还需阅读仓库 `.agents/skills/antd/SKILL.md`，并在写组件前使用 `antd` MCP 核对 6.6.4 对应的 API 和示例。
