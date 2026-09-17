# Backend

本目录负责服务端接口、业务流程编排、可信环境中的规则执行和外部系统适配。

## 当前选型

已确认并安装（pnpm workspace `@class/backend`）：

- Node.js + NestJS 12（Fastify 适配器）
- `@nestjs/swagger`
- Better Auth
- CASL（`@casl/ability`、`@casl/prisma`）
- Prisma 7 + `@prisma/adapter-pg` + `pg`，数据库为 PostgreSQL

Schema 与迁移权威位置在 `db/`，不把业务代码放进 `db/`。试听业务范围见 [试听管理产品功能清单（V1）](../docs/trial-product-features-v1.md)，数据关系见 [试听切片数据关系 v2](../docs/trial-slice-data-relations-v2.md)。地址表见 [`docs/README.md`](../docs/README.md#设计来源)。

## 边界

- 不包含用户界面实现或前端构建产物。
- 数据访问通过清晰边界组织，不把存储细节泄漏到接口层。
- 外部服务调用集中处理超时、错误、重试和可观测性。大模型调用放在 `src/llm/`，业务层只传入已脱敏的上下文。
- 权限校验默认在可信服务端执行。

## 约定结构

- `src/`：实现代码。
- `src/llm/`：大模型适配。当前跟进草稿走 DeepSeek Pro（`deepseek-v4-pro`），密钥只从环境变量 `DEEPSEEK_API_KEY` 读取，不写入仓库。
- `scripts/`：认证演示账号等模块内可重复脚本。
- `tests/`：模块测试、集成测试和契约测试。
- `design/`：本模块的架构、接口和编码约定。
- `prisma.config.ts`：Prisma CLI 配置（连接串、schema / 迁移路径）。

## 验证命令

在仓库根目录：

```bash
./scripts/dev.sh
```

或拆开：

```bash
pnpm install
cp backend/.env.example backend/.env   # 填入本地 Postgres 连接串和 BETTER_AUTH_SECRET；AI 草稿另填 DEEPSEEK_API_KEY。不要提交
pnpm --filter @class/backend start:dev
pnpm --filter @class/backend build
```

开发环境 Swagger UI：`http://localhost:3000/api/docs`。

当前登录接口（Better Auth，不走业务角色鉴权）：

- `POST /api/auth/sign-in/email`：邮箱密码登录（HttpOnly Cookie）
- `POST /api/auth/sign-out`：退出
- `GET /api/auth/get-session`：当前会话；未登录返回 `null`

业务接口默认先校验会话，再按角色鉴权（本期仅 `admin` / `teacher`）。公开接口只放在 `/api/common`。不提供 `GET /api/me`。

当前试听待办接口：

- `GET /api/trial-tasklist`：当前管理员名下学生关联的试听流程列表。查询 `TrialCase`，并按 `student.owner_admin_id` 限定为当前管理员；教师 403。
- `GET /api/trial-cases/:trialCaseId/schedulable-sessions`：该试听可安排的未来课次（未取消、未开始，且该学生尚未有该课次记录），以及关联学生的 `id` / `displayName`。教师 403。
- `POST /api/trial-cases/:trialCaseId/schedule`：为试听选择已有课次。`pending_schedule` 时写入新预约并改为 `scheduled`；`scheduled` 且仍有有效未到课预约时先取消旧预约再写入新预约，状态保持 `scheduled`。教师 403。
- `GET /api/trial-cases/:trialCaseId`：当前管理员名下该试听的跟踪详情（沟通草稿、教师反馈、跟进历史）。教师 403。
- `POST /api/trial-cases/:trialCaseId/followup-draft/generate`：服务端组装脱敏试听背景（不含学生/家长姓名、电话、邮箱）和教师反馈，调用 DeepSeek Pro 生成不超过 200 字的家长沟通草稿。不落库、不推进 `TrialCase.status`。仅 `pending_followup` / `following_up`。未配置密钥时 503。教师 403。
- `POST /api/trial-cases/:trialCaseId/followup-draft`：保存沟通草稿，不推进 `TrialCase.status`。仅 `pending_followup` / `following_up`。教师 403。
- `POST /api/trial-cases/:trialCaseId/follow-ups`：提交跟进结果。事务内锁定 TrialCase，追加 FollowUp：未联系上/考虑中 → `following_up` 并写入未来 `next_followup_at`；有报名意向 → `interested`；暂不考虑 → `closed`。教师 403。重复提交不得把后续阶段重置。
- `GET /api/students/:studentId`：学生与试听课程详情。管理员只能读 `owner_admin_id` 为自己的学生；教师 403。

当前课次参与接口：

- `GET /api/session-participants`：当前教师名下已安排试听（课次未取消、有效预约出勤仍为 pending）。含尚未上课的记录，此时 `canProcess` 为 false；课次结束后为 true。管理员 403。
- `GET /api/session-participants/:participantId`：当前教师可处理的单条试听（课次已结束）。尚未上课或不在名单中 404。
- `POST /api/session-participants/:participantId/attendance`：教师登记已到课（含反馈）或未到课。事务内锁定 TrialCase；已到课 → pending_followup，未到课 → pending_schedule。重复提交 409。

不开放注册。演示账号与密码以 `db/README.md` 为准。

Prisma：

```bash
pnpm --filter @class/backend prisma:generate
pnpm --filter @class/backend prisma:deploy
pnpm --filter @class/backend seed:auth
```

`prisma:deploy` 应用 `db/migrations/`。业务种子是 `db/seed/001-trial-journey.sql`；登录哈希还要再跑 `seed:auth`。本地把库清回同一套演示数据用 `./scripts/db-reset.sh --yes`。

修改实现前先阅读 `design/rule.md`。文件名必须 kebab-case，见 `docs/code-conventions.md`。
