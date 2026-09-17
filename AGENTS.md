# 项目协作说明

本仓库按职责组织。已确认技术选型见 `docs/project-structure.md` 与各模块 `README.md`。计划中的内容不得写成已经实现。现有业务文件保持原位；除非任务明确要求，不主动搬迁或重写。

## 目录职责

| 目录 | 职责 | 进入前必须阅读 |
|---|---|---|
| `frontend/` | 用户界面、客户端交互和客户端适配 | `frontend/README.md`；修改实现前再读 `frontend/design/rule.md` |
| `backend/` | 服务端接口、业务编排和外部系统适配 | `backend/README.md`；修改实现前再读 `backend/design/rule.md` |
| `db/` | 数据结构、迁移、种子数据和数据维护说明 | `db/README.md` |
| `docs/` | 项目结构、架构、决策和长期维护文档 | `docs/README.md` |
| `eval/` | 可重复的质量评估用例、基线和结果 | `eval/README.md` |
| `scripts/` | 项目级、可重复执行的辅助脚本 | `scripts/README.md` |
| `.github/` | GitHub Actions 与仓库级 GitHub 配置 | `docs/project-structure.md` |

## AI 工作约束

1. 开始任务先确认范围，只读取完成任务所需的文件。用户要求只看目录或规范时，不打开业务源码。
2. 进入一级目录前先读该目录的 `README.md`；修改 `frontend/` 或 `backend/` 实现前，再读对应的 `design/rule.md`。
3. 按各模块 README 中已确认选型实现，不根据目录名另猜技术栈。新增或替换语言、框架、组件库、数据库、构建工具或依赖前，必须有明确需求和可说明的收益。
4. 不安装依赖、不生成锁文件、不改运行环境，除非任务明确需要并获得用户授权。获得授权后只用 pnpm；禁止用 npm 或 yarn 安装依赖，禁止生成或提交 `package-lock.json` / `yarn.lock`。锁文件只维护根目录 `pnpm-lock.yaml`。
5. 优先做最小、聚焦、可回退的修改；保留与当前任务无关的用户改动，不顺手重构。
6. 手写源码的文件名和目录名只用 kebab-case（小写字母、数字、连字符），禁止大写。规范正文见 `docs/code-conventions.md`。
7. 不读取、提交或输出密钥、令牌、真实环境变量及其他敏感信息；示例只使用占位值。
8. 不执行破坏性命令，不覆盖未知内容。涉及删除、迁移、批量替换或数据变更时，先确认目标和恢复方式。
9. 修改公共契约、目录职责或跨层交互时，同步更新相关文档；计划中的内容不得写成已经实现。
10. 实现完成后运行与改动相称的检查。若项目尚未配置检查工具，不擅自安装，改为说明未验证项。
11. 回答中明确区分事实、推断和建议；遇到影响方案的缺失信息时先说明假设。

## 通用工作流程

1. 阅读本文件和目标目录说明。
2. 检查工作区状态，避免覆盖已有改动。
3. 明确验收标准与影响范围。
4. 实施最小改动，并同步必要文档。
5. 执行现有检查，报告结果与剩余风险。

## 结构维护

- 同一职责只保留一个权威位置，避免在多个一级目录重复维护。
- 模块内部的详细设计放在模块自己的 `design/` 下；跨模块约定放在 `docs/`。
- 调整一级目录职责时，同一变更中更新本文件和 `docs/project-structure.md`。

## Ant Design CLI MCP

本仓库前端使用 Ant Design 6.6.4。编写或修改 Ant Design 组件前，先通过 `antd` MCP 查询对应版本的官方 API，不凭记忆猜测。完整工作流见 `.agents/skills/antd/SKILL.md`。

- `antd_info`：组件 props、默认值和废弃信息。
- `antd_doc`：完整组件文档。
- `antd_demo`：可运行的官方示例。
- `antd_token` / `antd_design_md`：组件 Token 与整体设计语言。
- `antd_semantic`：组件语义化 `classNames` / `styles`。
- `antd_changelog`：版本与组件变更。

查询时使用项目版本 `6.6.4`。修改 Ant Design 代码后，对变更范围运行 Ant Design lint。MCP 配置使用 pnpm；禁止改成 `npx -y` 或通过 npm/yarn 安装 CLI。
