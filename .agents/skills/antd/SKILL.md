---
name: antd
description: >
  Use when the user's task involves Ant Design (antd) — writing antd components,
  debugging antd issues, querying antd APIs/props/tokens/demos, migrating between
  antd versions, or analyzing antd usage in this project. Triggers on antd-related
  code, imports from 'antd', or explicit antd questions.
allowed-tools:
  - Bash(antd *)
  - Bash(pnpm dlx @ant-design/cli *)
---

# Ant Design CLI

本项目使用 Ant Design 6.6.4。处理 Ant Design 组件、API、主题、迁移或问题排查时，优先使用项目配置的 `antd` MCP 查询官方知识，不要凭训练数据猜测 API。

## 使用边界

- 优先调用 MCP 提供的结构化工具。
- CLI 已可用时，可以直接运行 `antd`。
- 不使用 npm 或 yarn，不自动全局安装 CLI。
- 需要临时运行 CLI 且本机不可用时，先遵守根目录 `AGENTS.md` 的授权要求，再使用 `pnpm dlx @ant-design/cli ...`。
- 知识查询始终传入 `--version 6.6.4`；需要结构化输出时始终使用 `--format json`。
- 不因查询或检查修改项目依赖、`package.json` 或 `pnpm-lock.yaml`。

## 写组件

写任何 Ant Design 组件前，先确认 API，再获取可运行示例：

```bash
antd info Button --version 6.6.4 --format json
antd demo Button basic --version 6.6.4 --format json
antd semantic Button --version 6.6.4 --format json
antd token Button --version 6.6.4 --format json
antd design.md --version 6.6.4 --format json
```

工作顺序：`info` → 理解 props → `demo` → 根据项目约束实现。涉及自定义样式时再查 `semantic`，涉及主题时再查 `token` 或 `design.md`。

## 查完整文档

```bash
antd doc Table --version 6.6.4 --format json
antd doc Table --version 6.6.4 --lang zh --format json
```

## 排查问题

```bash
antd env --format json
antd doctor --format json
antd info Select --version 6.6.4 --format json
antd lint ./frontend/src --format json
```

工作顺序：`env` → `doctor` → 用精确版本核对 API → `lint` 检查废弃或错误用法。

## 版本迁移

```bash
antd migrate 5 6 --format json
antd migrate 5 6 --component Select --format json
antd migrate 5 6 --apply ./frontend/src --format json
antd changelog 5.0.0 6.6.4 --format json
antd changelog 5.0.0 6.6.4 Select --format json
```

`migrate --apply` 只生成面向 Agent 的迁移提示，不应假定它已修改文件。先查看迁移清单和 changelog，再实施并运行 lint。

## 分析项目用法

```bash
antd usage ./frontend/src --format json
antd usage ./frontend/src --filter Form --format json
antd lint ./frontend/src --format json
antd lint ./frontend/src --only deprecated --format json
antd lint ./frontend/src --only a11y --format json
antd lint ./frontend/src --only performance --format json
```

## 查看组件与版本变化

```bash
antd list --version 6.6.4 --format json
antd changelog 6.6.4 --format json
```

## 报告问题

只有用户明确要求提交问题时，才使用报告命令。必须先生成预览并展示给用户，得到确认后才能加 `--submit`。

```bash
antd bug --title "Issue title" \
  --reproduction "https://example.com/reproduction" \
  --steps "1. ... 2. ..." \
  --expected "Expected behavior" \
  --actual "Actual behavior" \
  --format json

antd bug-cli --title "CLI issue title" \
  --description "Description" \
  --steps "1. ... 2. ..." \
  --expected "Expected behavior" \
  --actual "Actual behavior" \
  --format json
```

若环境变量 `ANTD_NO_AUTO_REPORT=1`，除非用户直接要求，否则不建议报告 Ant Design 或 CLI 问题。

## MCP 能力

仓库 `.cursor/mcp.json` 暴露以下知识查询能力：

- `antd_list`
- `antd_info`
- `antd_doc`
- `antd_demo`
- `antd_token`
- `antd_design_md`
- `antd_semantic`
- `antd_changelog`

## 核心规则

1. 写代码前查询，不凭记忆猜 API。
2. 所有知识查询匹配项目版本 6.6.4。
3. 结构化输出使用 JSON，不用正则解析文本输出。
4. 建议升级前先查迁移清单和 changelog。
5. 修改 Ant Design 代码后，对变更范围运行 lint。
6. 报告问题必须先预览并获得用户确认。
7. 不使用 npm/yarn，不自动安装全局 CLI。

