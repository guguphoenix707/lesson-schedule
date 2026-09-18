# 前端编码约定

已确认：Vite + React + TypeScript SPA，UI 用 Ant Design。本期不用 Next.js。

## 设计

- 保持高内聚、低耦合；页面负责组合，稳定的通用能力再下沉复用。
- 状态只保留一个权威来源，避免多个布尔值或重复数据表达同一事实。
- 类型或数据结构用于描述稳定边界，不为穷尽理论可能性引入难以维护的复杂抽象。
- 组件按单一职责拆分，并按使用范围放置：仅被一个页面使用的实现放在该页面目录下的 `components/`，不要放到全局 `src/components/`；被多个页面使用的实现才放入全局 `src/components/`。不要为“以后可能复用”提前提升到全局。
- 可访问性、加载态、空态、错误态和窄屏体验属于功能的一部分。

## 抽象与依赖

- 不为“统一入口”创建只改名并透传参数的包装层。
- 只有在承载业务规则、隔离确定会变化的实现、统一副作用或明显减少重复时才新增抽象。
- 优先复用项目已有能力；新增依赖前说明现有能力为何不足、维护成本和替代方案。
- 不主动修正服务端数据语义；契约不明确时先澄清或在边界处显式校验。
- 使用 Ant Design 组件与约定；不为换皮肤并行引入第二套组件库。
- 前端只根据服务端返回的权限做展示或禁用；强制执行仍在服务端。CASL 能力由会话角色生成，经 `AbilityProvider` 提供给已登录路由。

## HTTP 路径

请求都走 `src/api/http-base.ts`。本地默认使用同源 `/api`；部署构建可通过 `VITE_API_BASE_URL` 提供后端源站，代码会在其后追加 `/api`。按服务端前缀分工，不要用业务 `/me` 表示当前登录者。

| 路径 | 前端模块 | 说明 |
|---|---|---|
| `/auth/*` | `src/api/auth.ts` | 登录、退出、读会话。未登录时 `get-session` 为 `null`。 |
| `/common/*` | 对应公开接口客户端 | 不依赖登录。 |
| `/trial-tasklist` | `src/api/trial-tasklist.ts` | 当前管理员名下学生关联的试听流程列表。教师 403。 |
| `/trial-cases/:trialCaseId/schedulable-sessions` | `src/api/trial-cases.ts` | 该试听可安排的未来课次，以及关联学生 id / displayName。教师 403。 |
| `/trial-cases/:trialCaseId/schedule` | `src/api/trial-cases.ts` | 为待安排或改期试听选择已有课次。教师 403。 |
| `/trial-cases/:trialCaseId` | `src/api/trial-cases.ts` | 管理员试听跟踪详情：草稿、教师反馈、跟进历史。教师 403。 |
| `/trial-cases/:trialCaseId/followup-draft/generate` | `src/api/trial-cases.ts` | 服务端生成 AI 沟通草稿，不落库、不推进 TrialCase.status。仅 pending_followup / following_up。教师 403。 |
| `/trial-cases/:trialCaseId/followup-draft` | `src/api/trial-cases.ts` | 保存沟通草稿，不推进 TrialCase.status。仅 pending_followup / following_up。教师 403。 |
| `/trial-cases/:trialCaseId/follow-ups` | `src/api/trial-cases.ts` | 提交跟进结果并追加 FollowUp。教师 403。 |
| `/students/:studentId` | `src/api/students.ts` | 学生卡片与试听课程。管理员只能读自己负责的学生。 |
| `/session-participants` | `src/api/session-participants.ts` | 当前教师名下已安排试听（含尚未上课）；`canProcess` 表示课次已结束、可以登记。管理员 403。 |
| `/session-participants/:participantId` | `src/api/session-participants.ts` | 当前教师可处理的单条试听。尚未上课或不在名单中 404。 |
| `/session-participants/:participantId/attendance` | `src/api/session-participants.ts` | 教师登记已到课或未到课。重复提交 409。 |

## HTTP 错误处理

HTTP 状态码只在 `httpBase` 响应拦截器处理，这是唯一收口。业务 API、页面和组件不得用 `isHttpUnauthorized`、`error.response.status === 401` 等判断 401 / 403 / 404 / 409 / 400。

拦截器负责：

- 把失败响应转成带中文的 `Error` 再拒绝；调用方只读 `error.message`。
- `GET /auth/get-session` 的 401 当成未登录，返回 `data: null`，不抛错。
- `POST /auth/sign-in/email` 的 401 固定为「邮箱或密码不正确」。
- 其余 401 为「请先登录」；403 / 404 / 409 / 400 / 5xx 优先用服务端文案，没有或是 Nest 默认英文再用通用提示。
- 无响应时区分超时（「请求超时，请稍后重试」）和断连（「无法连接服务，请稍后重试」）。

业务模块只发请求和取数据：

```ts
export async function fetchStudent(studentId: string): Promise<StudentDetail> {
  const { data } = await httpBase.get<StudentDetail>(`/students/${studentId}`);
  return data;
}
```

不要在业务模块里按状态码分支，也不要把 `isHttpUnauthorized` 这类辅助函数导出给业务层。需要改某类 HTTP 错误的文案或行为时，只改 `src/api/http-base.ts`。

## Ant Design

- 当前版本为 6.6.4。写组件前先用 `antd` MCP 查询该版本的 API，不凭记忆猜 props、默认值或废弃状态。
- 非平凡用法先查 `antd_demo` 获取可运行示例；定制样式前查 `antd_semantic`，主题设计前查 `antd_token` 或 `antd_design_md`。
- 优先使用组件公开 API、语义化 `classNames` / `styles` 和 Design Token，不依赖易变的内部 DOM 结构或生成类名。
- 主题与视觉变量通过统一主题入口维护，不在页面和组件中散落重复的品牌色、圆角、间距或层级数值。
- 页面和组件样式使用 CSS Modules（`*.module.css`）。只有文档根、重置和跨应用 CSS 变量放在 `src/styles/global.css`。
- 修改 Ant Design 代码后，对变更范围运行 Ant Design lint；CLI 使用细节以 `.agents/skills/antd/SKILL.md` 为准。

## 实现与验证

- 命名表达用户意图和领域含义，避免魔法字符串、含糊缩写和超长函数。
- 文件名和目录名使用 kebab-case，不含大写字母。细则见 `docs/code-conventions.md`。
- 异步流程必须覆盖成功、失败、取消或过期响应等适用场景。
- 测试优先验证可观察行为和边界条件，避免与内部实现细节强耦合。
- 格式化、静态检查和测试以仓库已有配置为准；尚未配置时不擅自引入工具。
