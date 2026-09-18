# Scripts

本目录保存项目级、可重复执行的辅助脚本。

- 脚本应支持非交互执行，并对危险操作提供显式确认或预演模式。
- 不在脚本中硬编码密钥、个人路径或机器专属配置。
- 每个脚本应在文件头或相邻文档中说明用途、前置条件、输入和副作用。
- 模块专属脚本优先放在对应模块内部。
- `check-filenames.mjs`：检查手写源码的文件名和目录名是否为 kebab-case。无输入；发现违规时以非零状态退出。
- `dev.sh`：本地一键启动。缺依赖时 `pnpm install`；没有 `backend/.env` 时从 example 原子创建并生成随机认证密钥（不覆盖已有文件），同时把新建或已有 `.env` 权限限制为当前用户读写。`DATABASE_URL` 指向本地 `55432` 时拉起 `db/docker-compose.yml` 的 Postgres；仅当所有受管表都无数据时写入演示种子，非空库绝不自动重置。脚本会验证 3000 / 5173 上确实是本项目服务，等待健康检查，并在依赖、Docker、数据库或端口异常时给出排查命令。Ctrl+C 只停止本次拉起的进程；任一新启动服务意外退出时会停止另一个。
- `db-reset.sh`：清空并重建演示库，结果与仓库种子一致。复用 `prisma:deploy`、`db/seed/001-trial-journey.sql`、`pnpm --filter @class/backend seed:auth`。非交互必须加 `--yes`；`--dry-run` 只打印步骤。
