# 项目结构说明

## 当前结构

```text
class/
├── AGENTS.md
├── README.md
├── .agents/
│   └── skills/antd/SKILL.md
├── .cursor/
│   ├── mcp.json
│   ├── rules/
│   └── skills/antd -> ../../.agents/skills/antd
├── .github/
│   └── workflows/
│       └── ci.yml
├── frontend/
│   ├── README.md
│   ├── package.json
│   ├── eslint.config.js
│   ├── .prettierrc.json
│   ├── .prettierignore
│   ├── .editorconfig
│   ├── design/rule.md
│   ├── design/trial-journey/
│   ├── src/
│   └── tests/
├── backend/
│   ├── README.md
│   ├── package.json
│   ├── prisma.config.ts
│   ├── design/rule.md
│   ├── src/
│   ├── scripts/
│   └── tests/
├── db/
│   ├── README.md
│   ├── schema.prisma
│   ├── docker-compose.yml
│   ├── migrations/
│   └── seed/
├── docs/
│   ├── README.md
│   ├── code-conventions.md
│   ├── project-structure.md
│   ├── 技术作业.html
│   ├── trial-slice-data-relations-v2.md
│   ├── trial-product-features-v1.md
│   └── assets/trial-slice-data-relations-v2/
├── eval/
│   ├── README.md
│   ├── cases/
│   └── results/
├── scripts/
│   ├── README.md
│   ├── check-filenames.mjs
│   ├── db-reset.sh
│   └── dev.sh
├── index.js             # 初始化前已有文件，未读取或修改
├── package.json         # pnpm workspace 根，packageManager 为 pnpm
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

## 组织原则

仓库按前端、后端、数据、文档、评估隔离。已确认选型见下表。未实现的能力不得写成已经完成。

现有根目录业务文件保持原位。是否迁入某个模块，应在了解其职责并确认目标结构后单独处理。

## 已确认技术选型

| 层 | 选择 | 约束 |
|---|---|---|
| 前端 | Vite + React + TypeScript SPA，Ant Design | 本期不引入 Next.js。界面不作为权限或业务规则的唯一防线。依赖声明见 `frontend/package.json`。 |
| 后端 | Node.js + TypeScript + NestJS | 登录会话用 Better Auth；权限判定用 CASL，在服务端强制。 |
| 数据 | PostgreSQL + Prisma 7 | Schema 以 `db/schema.prisma` 为准；迁移由 Prisma 写入 `db/migrations/`。应用代码不放在 `db/`。 |
| 包管理 | pnpm workspace | 只用 pnpm；锁文件为 `pnpm-lock.yaml`。禁止 npm / yarn 安装或生成 `package-lock.json` / `yarn.lock`。 |

## 目录职责

- `frontend/`：用户界面、客户端交互和客户端适配。
- `backend/`：服务端接口、业务流程和外部系统适配。
- `db/`：数据结构、迁移和非敏感种子数据。
- `docs/`：跨模块且需要长期维护的文档。
- `eval/`：独立于生产实现的质量用例、基线和结果。
- `scripts/`：跨模块的重复性辅助操作。
- `.github/`：GitHub Actions 与仓库级 GitHub 配置。

## 文档阅读顺序

1. 项目级任务先读根目录 `AGENTS.md`。
2. 进入一级目录后读该目录的 `README.md`。
3. 修改前端或后端实现时，再读对应 `design/rule.md`。
4. 调整目录或职责时读本文件，并在同一变更中更新它。

## 维护要求

- 文档只描述真实存在的结构；计划项明确标注为计划。
- 手写源码的文件名和目录名使用 kebab-case，不含大写字母。权威说明见 `docs/code-conventions.md`。
- 根目录只放项目级入口和全局配置，模块专属配置归入对应模块。
- 不创建与现有目录职责重叠的新根目录。
- 选型变更时同步对应模块 README。只记录影响边界的决策，不为安装依赖单独写说明。
