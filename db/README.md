# Data

本目录保存 PostgreSQL 结构、迁移和种子数据。应用代码不放在这里。

## 约定

- `schema.prisma`：给后端用的模型。约束以迁移 SQL 为准；Prisma 表达不了的 CHECK、部分唯一索引和老师课次互斥写在迁移里。
- `migrations/`：Prisma 迁移目录。按序执行，不要手改已应用的 `migration.sql`。
- `seed/`：非敏感的开发或测试种子数据；手写 SQL 文件名用 kebab-case。
- 禁止提交生产数据、凭据或未经脱敏的数据样本。

## 本期范围

依据 [试听切片数据关系 v2](../docs/trial-slice-data-relations-v2.md) 和 [试听管理产品功能清单（V1）](../docs/trial-product-features-v1.md)。流程语境另见 [Journey-试听](https://my.feishu.cn/wiki/GAPNwCpt8i2xzCk6VaqcY7TmnIe)。完整地址表见 [`docs/README.md`](../docs/README.md#设计来源)。

已建表：`users`、`students`、`campuses`、`guardians`、`student_guardians`、`courses`、`classes`、`class_sessions`、`trial_cases`、`session_participants`、`follow_ups`，以及 Better Auth 使用的 `session`、`account`、`verification`。

图上为后续模块、本期不建表：`schedule_rules`、`enrollments`、`credit_accounts`、`credit_entries`。`SessionKind` 目前只有 `trial`；正式入班时再加 `regular` 和 `enrollment_id`。

家长/学生/课程字段对齐公开试听表 [预约试课](https://www.austineducation.com.au/zh/book-a-trial)。年级下拉的具体选项官网未完整给出，按 Year 1–12 处理。科目按已发布课程目录预设。Ausyouth Music 不在本目录。

业务时间按 `Australia/Melbourne` 解释和展示；库内使用 `timestamptz`。

## 执行

需要 PostgreSQL 14+。本地推荐用 `./scripts/dev.sh`：它会拉起 `docker-compose.yml` 里的 Postgres（映射到宿主机 `55432`），空库才写入种子。连接串示例见 `backend/.env.example`。用户名 `postgres` / 密码 `postgres` 只用于这个本地开发容器。

不经过 Docker、后端依赖也未安装时，用本机 `psql`：

```bash
createdb class
psql -d class -v ON_ERROR_STOP=1 -f db/migrations/20260917080000_init_trial_slice/migration.sql
psql -d class -v ON_ERROR_STOP=1 -f db/migrations/20260917090000_better_auth/migration.sql
psql -d class -v ON_ERROR_STOP=1 -f db/migrations/20260917100000_trial_intake_from_public_form/migration.sql
psql -d class -v ON_ERROR_STOP=1 -f db/seed/001-trial-journey.sql
```

后端依赖安装后：

```bash
cp backend/.env.example backend/.env   # 填入本地 Postgres 连接串和 BETTER_AUTH_SECRET
pnpm --filter @class/backend prisma:generate
pnpm --filter @class/backend prisma:deploy
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/seed/001-trial-journey.sql
pnpm --filter @class/backend seed:auth
```

`001-trial-journey.sql` 会 `TRUNCATE` 业务表和认证表后写入虚构旅程数据；`users.password_hash` 仍是 pgcrypto 哈希，**不能**用来登录。登录密码由 `seed:auth` 写入 `account.password`（Better Auth 哈希）。

回滚结构（会删除这些表中的全部行）：

```bash
psql -d class -v ON_ERROR_STOP=1 -f db/migrations/20260917100000_trial_intake_from_public_form.down.sql
psql -d class -v ON_ERROR_STOP=1 -f db/migrations/20260917090000_better_auth.down.sql
psql -d class -v ON_ERROR_STOP=1 -f db/migrations/20260917080000_init_trial_slice.down.sql
```

种子脚本只用于本地或一次性演示库。仓库里没有原始 Excel；seed 是符合 journey 形态的虚构数据。

## 演示账号

以下账号均为虚构演示数据，**不是**生产凭据。密码全部为 `DemoPass123!`。登录走 Better Auth 邮箱密码，不开放注册。

| 邮箱 | 角色 | 姓名 | 用途 |
|---|---|---|---|
| `ava.admin@example.com` | admin | Ava Chen | 名下 24 名未缴费学生，覆盖待安排 / 缺席重约 / 改期 / 待老师登记 / 待跟进 / 跟进中 / 待报名 / 已关闭 |
| `ben.admin@example.com` | admin | Ben Walsh | 较小的顾问名单 |
| `chen.admin@example.com` | admin | Chen Li | 含一条待老师登记 |
| `lina.teacher@example.com` | teacher | Lina Park | Year 5 数学默认老师；含已结束待登记、以及尚未上课的已安排试听 |
| `tom.teacher@example.com` | teacher | Tom Harris | Year 3 英语默认老师 |
| `mei.teacher@example.com` | teacher | Mei Huang | Year 7 科学（周日）默认老师 |
| `noah.teacher@example.com` | teacher | Noah Singh | Year 7 科学（周三）默认老师 |
| `priya.teacher@example.com` | teacher | Priya Nair | Year 4 写作默认老师 |
| `hugo.teacher@example.com` | teacher | Hugo Bennett | Year 5 数学（周日）默认老师；含一节已取消课次 |
