# 项目结构说明

## 当前结构

```text
class/
├── AGENTS.md
├── README.md
├── .cursor/rules/
├── frontend/
│   ├── README.md
│   ├── eslint.config.js
│   ├── .prettierrc.json
│   ├── .prettierignore
│   ├── .editorconfig
│   ├── design/rule.md
│   ├── src/
│   └── tests/
├── backend/
│   ├── README.md
│   ├── design/rule.md
│   ├── src/
│   └── tests/
├── db/
│   ├── README.md
│   ├── migrations/
│   └── seed/
├── docs/
│   ├── README.md
│   ├── code-conventions.md
│   ├── project-structure.md
│   └── 技术作业.html
├── eval/
│   ├── README.md
│   ├── cases/
│   └── results/
├── scripts/
│   └── README.md
├── index.js             # 初始化前已有文件，未读取或修改
└── package.json         # 初始化前已有文件，未读取或修改
```

## 组织原则

仓库参考前端、后端、数据、文档、评估相互隔离的组织方式，但不通过目录预设具体技术选型。只有在需求明确后，才增加语言、框架、依赖、构建、部署和持续集成配置。

`frontend/` 已按要求复用参考项目的 ESLint、Prettier 和 EditorConfig 约束；相关工具依赖与执行脚本尚未安装或写入 `package.json`。

现有根目录业务文件在本次初始化中保持原位。是否迁入某个模块，应在了解其职责并确认目标结构后单独处理。

## 目录职责

- `frontend/`：用户界面、客户端交互和客户端适配。
- `backend/`：服务端接口、业务流程和外部系统适配。
- `db/`：数据结构、迁移和非敏感种子数据。
- `docs/`：跨模块且需要长期维护的文档。
- `eval/`：独立于生产实现的质量用例、基线和结果。
- `scripts/`：跨模块的重复性辅助操作。

## 文档阅读顺序

1. 项目级任务先读根目录 `AGENTS.md`。
2. 进入一级目录后读该目录的 `README.md`。
3. 修改前端或后端实现时，再读对应 `design/rule.md`。
4. 调整目录或职责时读本文件，并在同一变更中更新它。

## 维护要求

- 文档只描述真实存在的结构；计划项明确标注为计划。
- 根目录只放项目级入口和全局配置，模块专属配置归入对应模块。
- 不创建与现有目录职责重叠的新根目录。
- 技术选型确定后，在对应模块文档中记录选择、版本范围和验证命令。
