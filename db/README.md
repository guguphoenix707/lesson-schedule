# Data

本目录保存 PostgreSQL 结构、迁移和种子数据。应用代码不放在这里。

## 约定

- `schema.prisma`：给后端用的模型。约束以迁移 SQL 为准；Prisma 表达不了的 CHECK、部分唯一索引和老师课次互斥写在迁移里。
- `migrations/`：Prisma 迁移目录。按序执行，不要手改已应用的 `migration.sql`。
- `seed/`：非敏感的开发或测试种子数据。
- 禁止提交生产数据、凭据或未经脱敏的数据样本。

## 本期范围

依据 [试听切片数据关系 v2](https://my.feishu.cn/wiki/Qoepw4h6IisXyVkb8VVcXGcynZd) 和 [Journey-试听](https://my.feishu.cn/wiki/GAPNwCpt8i2xzCk6VaqcY7TmnIe)。

已建表：`users`、`students`、`courses`、`classes`、`class_sessions`、`trial_cases`、`session_participants`、`follow_ups`。

图上为后续模块、本期不建表：`schedule_rules`、`enrollments`、`credit_accounts`、`credit_entries`、家长/监护关系。`SessionKind` 目前只有 `trial`；正式入班时再加 `regular` 和 `enrollment_id`。

业务时间按 `Australia/Melbourne` 解释和展示；库内使用 `timestamptz`。

## 执行

需要 PostgreSQL 14+。连接串示例见 `backend/.env.example`。后端依赖未安装时，用 `psql` 执行 SQL。

```bash
createdb class
psql -d class -v ON_ERROR_STOP=1 -f db/migrations/20260917080000_init_trial_slice/migration.sql
psql -d class -v ON_ERROR_STOP=1 -f db/seed/001_trial_journey.sql
```

后端依赖安装后，在 `backend/` 执行：

```bash
pnpm --filter @class/backend exec prisma migrate deploy
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ../db/seed/001_trial_journey.sql
```

回滚结构（会删除这些表中的全部行）：

```bash
psql -d class -v ON_ERROR_STOP=1 -f db/migrations/20260917080000_init_trial_slice.down.sql
```

种子脚本会 `TRUNCATE` 上述表，只用于本地或一次性演示库。仓库里没有原始 Excel；seed 是符合 journey 形态的虚构数据。

## 演示账号

密码均为 `DemoPass123!`（seed 用 pgcrypto 写入哈希，不是生产凭据）。Better Auth 接入后，凭据应改由认证表管理。

| 邮箱 | 角色 | 用途 |
|---|---|---|
| `ava.admin@example.com` | admin | 名下 24 名未缴费学生，覆盖待安排 / 缺席重约 / 改期 / 待老师登记 / 待跟进 / 跟进中 / 待报名 / 已关闭 |
| `ben.admin@example.com` | admin | 较小的顾问名单 |
| `chen.admin@example.com` | admin | 含一条待老师登记 |
| `lina.teacher@example.com` | teacher | 已结束课次、待提交试听结果 |
