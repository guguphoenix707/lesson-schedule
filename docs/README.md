# Documentation

本目录保存需要评审和长期维护的项目文档。

## 内容范围

- `project-structure.md`：目录职责、维护规则和已确认技术选型。
- `code-conventions.md`：跨技术栈的通用代码规范。
- `技术作业.html`：项目已有的作业资料，保持原始内容。
- `trial-slice-data-relations-v2.md`：试听切片数据关系（飞书 Wiki 副本；附图在 `assets/trial-slice-data-relations-v2/`）。
- `trial-product-features-v1.md`：试听管理产品功能清单 V1（飞书文档副本）。
- 后续可按实际需要增加需求、架构、决策记录、运行说明和跨模块契约。

文档必须区分当前事实、已确认决策和待实施计划。模块专属的详细设计优先放在模块自己的 `design/` 目录。

## 设计来源

飞书原文是上游；仓库副本用于离线阅读和评审。仓库里的迁移、种子和代码是落地结果。不要把计划中的能力写成已经实现。

| 文档 | 仓库副本 | 飞书原文 | 用途 |
|---|---|---|---|
| 试听切片数据关系 v2：统一预约、排课与课时 | [`trial-slice-data-relations-v2.md`](trial-slice-data-relations-v2.md) | https://my.feishu.cn/wiki/Qoepw4h6IisXyVkb8VVcXGcynZd | 试听切片实体、关系和本期建表边界 |
| 试听管理产品功能清单（V1） | [`trial-product-features-v1.md`](trial-product-features-v1.md) | https://my.feishu.cn/docx/Wn7vdDTTsoDrlrxgjaKcyW8Sn1c | 管理员/教师试听功能、状态与允许操作、本期非目标 |
