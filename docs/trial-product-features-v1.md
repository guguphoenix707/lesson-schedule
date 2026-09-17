# 试听管理产品功能清单（V1）

> 仓库副本。来源：[飞书文档](https://my.feishu.cn/docx/Wn7vdDTTsoDrlrxgjaKcyW8Sn1c)，拉取于 2026-09-17，revision 28。正文保持来源表述，不代表功能已经实现。

用途：供产品、设计、研发、测试与业务共同核对试听管理 V1 的页面、功能、用户可见信息、操作路径和系统结果。

需求来源：[Journey-试听](https://my.feishu.cn/wiki/GAPNwCpt8i2xzCk6VaqcY7TmnIe)；[试听切片数据关系 v2：统一预约、排课与课时](trial-slice-data-relations-v2.md)

> **范围说明：**本文整理的是产品需求，不代表功能已经实现。源文档明确标注“本期不做”的内容保持为非目标；源文档未说明的规则统一标记为“待确认”，不做推断性承诺。

## 目标与范围

| 项目 | 说明 |
|-|-|
| 目标用户 | 管理员、教师；学生/家长端本期不做。 |
| 核心任务 | 管理员完成试听安排、改期和课后跟进；教师记录到课情况与课堂反馈；系统基于业务动作更新试听流程状态。 |
| 基础数据 | Course、Class、ClassSession 使用 seed 导入。本期不提供基础数据管理、文件导入或周期排课生成器。 |
| 本期非目标 | 管理员待办中心的信息汇总、AI 推荐沟通草稿、学生/家长试听报名、正式报班。 |

## 产品功能大表格

| 角色 | 页面 | 功能 | 入口 / 状态前置 | 用户看到什么 | 用户操作 | 系统结果 / 规则 | 范围 |
|-|-|-|-|-|-|-|-|
| 管理员 | 登录 | 登录后跳转 | 管理员完成登录 | 待办中心 | 登录系统 | 登录成功后进入待办中心 | 本期需求 |
| 管理员 | 待办中心 | 信息汇总 | 进入待办中心 | 计划展示：待安排数、待跟进数、已预约数、待办理报名数 | 查看汇总数据 | 待安排数 = pending_schedule；待跟进数 = pending_followup，或 following_up 且 next_followup_at 已到；已预约数 = scheduled；待办理报名数 = interested | 本期不做 |
| 管理员 | 待办中心 / 大表格 | 学生任务总览 | 登录后进入待办中心 | 学生姓名、试听流程状态、当前状态允许的操作；学生姓名可点击 | 查看列表；点击学生卡片；执行当前状态允许的操作 | 只展示“状态与允许操作”表中对应 status 可执行的操作；不提供任意修改 status 的入口 | 本期需求 |
| 管理员 | 待安排试听列表 | 查看待安排学生 | status = pending_schedule | 待安排试听的学生；可通过参与历史区分首次待安排、缺席后重约或取消后重约 | 点击学生卡片；进入安排试听 | 原预约、出勤与取消事实保留，不把缺席或取消覆盖成新记录 | 本期需求 |
| 管理员 | 学生卡片 | 查看脱敏信息 | 从列表点击学生卡片 | 学生脱敏信息；提供查看具体信息的入口 | 查看脱敏信息；点击查看具体信息 | 具体字段、脱敏规则、查看完整信息的权限和审计要求待确认 | 本期需求；隐私规则待确认 |
| 管理员 | 安排试听 | 创建试听安排 | status = pending_schedule | 由 seed 导入的已有课次；可按课程、教师和时间定位 | 选择已有课次并提交试听安排 | 创建有效 SessionParticipant(kind=trial)，TrialCase.status 变为 scheduled；服务端校验课次未取消、时间未开始、试听资格及时间冲突 | 本期需求 |
| 管理员 | 已安排试听列表 | 查看已安排学生 | status = scheduled | 已安排试听的学生、课次信息；根据课次结束时间与 attendance=pending 派生“等待上课”或“待老师登记结果” | 查看学生卡片；选择改期或取消当前预约 | 课次时间结束不会自动视为完成试听，也不靠定时任务修改 TrialCase.status | 本期需求 |
| 管理员 | 试听改期 | 修改试听安排 | status = scheduled，且当前预约仍有效、未到课 | 原试听安排和可选择的其他已有课次 | 选择新课次并提交改期 | 取消当前有效预约，使流程回到 pending_schedule；随后为同一 TrialCase 创建新 Participant 并回到 scheduled。旧记录保留，重新校验学生时间冲突 | 本期需求 |
| 管理员 | 待跟进学生列表 | 查看与排序待跟进学生 | status = pending_followup；或 status = following_up 且 next_followup_at 已到 | 学生姓名、最新跟进状态、下次跟进时间 | 查看列表；点击学生卡片；点击“处理” | pending_followup 优先展示；已到期的 following_up 按 next_followup_at 由近到远排序 | 本期需求 |
| 管理员 | 待跟进学生列表 | 打开跟踪页 | pending_followup；或已到期的 following_up | “处理”操作 | 点击“处理” | 新浏览器标签页打开该学生的试听跟踪页面 | 本期需求 |
| 管理员 | 试听跟踪详情 | 查看跟进上下文 | pending_followup 或 following_up | 沟通草稿、学生卡片、教师反馈、历史跟进记录；AI 推荐沟通草稿为规划项 | 查看上下文；编辑并保存沟通草稿；提交跟进结果 | 生成或保存草稿不推进 TrialCase.status | 普通草稿本期需求；AI 推荐本期不做 |
| 管理员 | 已跟进弹窗 | 记录“未联系上” | pending_followup 或 following_up | 跟进结果、下次跟进时间；默认次日 10:00 | 选择“未联系上”；设置未来的下次跟进时间；提交 | 追加 FollowUp；status 变为或保持 following_up；写入 next_followup_at | 本期需求 |
| 管理员 | 已跟进弹窗 | 记录“家长需要考虑” | pending_followup 或 following_up | 跟进结果、沟通摘要、下次跟进时间；默认次日 10:00 | 选择“家长需要考虑”；填写摘要；设置未来的下次跟进时间；提交 | 追加 FollowUp；status 变为或保持 following_up；写入 next_followup_at | 本期需求 |
| 管理员 | 已跟进弹窗 | 记录“有报名意向” | pending_followup 或 following_up | 跟进结果、沟通摘要、“标记待办理报名”操作 | 选择“有报名意向”；填写摘要；提交 | 追加 FollowUp；status 变为 interested；清空当前 next_followup_at。后续报名办理本期不实现 | 本期需求；报名办理非目标 |
| 管理员 | 已跟进弹窗 | 记录“暂不考虑” | pending_followup 或 following_up | 跟进结果、沟通摘要、关闭原因 | 选择“暂不考虑”；填写摘要或原因；提交 | 追加 FollowUp；status 变为 closed；清空当前 next_followup_at；不提供任意恢复状态的通用操作 | 本期需求 |
| 管理员 | 已结束流程详情 | 查看终态 | status = interested 或 closed | interested：待办理报名及历史记录；closed：最后一次跟进结果、关闭原因及历史记录 | 只读查看 | interested 的报名办理本期不实现；closed 不提供重新开启或任意改状态操作 | 本期需求 |
| 教师 | 登录 | 登录后跳转 | 教师完成登录 | 试听跟踪页面 | 登录系统 | 登录成功后进入试听跟踪 | 本期需求 |
| 教师 | 试听跟踪列表 | 查看待处理试听 | status = scheduled；assigned_teacher_id = 当前教师；课次未取消且已结束；有效预约 attendance = pending | 课程时间、学生姓名和“处理”操作 | 点击“处理” | 未满足全部前置条件时不可处理；权限以课次当前 assigned_teacher_id 判断 | 本期需求 |
| 教师 | 试听处理 | 记录“已到课” | 满足教师待处理条件 | 表现评价、适配建议、需顾问确认的问题；提示填写当前课程是否适合及观察依据 | 选择“已到课”；填写反馈并提交 | Participant.attendance = present 并保存反馈；TrialCase.status 由 scheduled 变为 pending_followup。重复提交不得重置后续跟进阶段 | 本期需求 |
| 教师 | 试听处理 | 记录“未到课” | 满足教师待处理条件 | “未到课”选项及可选说明 | 选择“未到课”；按需填写说明；提交 | Participant.attendance = absent；TrialCase.status 由 scheduled 变为 pending_schedule；原预约与缺席事实保留，可在同一流程下重约 | 本期需求 |
| 学生 / 家长 | 试听报名 / 正式报班 | 自主报名与报班 | 未定义 | 未定义 | 试听报名、正式报班 | 本期不定义页面、表单、支付或状态变化 | 本期不做 |

## 状态与允许操作

| 状态 | 界面显示 | 管理员可操作 | 教师可操作 | 操作结果 / 限制 |
|-|-|-|-|-|
| **pending_schedule** | 待安排试听 | 选择已有课次，安排或重新安排试听 | 无 | 创建有效的 trial Participant，状态变为 scheduled。服务端校验课次时间、试听资格和时间冲突；首次待安排与缺席/取消后的重约由参与历史区分。 |
| **scheduled** | 已安排试听<br>派生标签：等待上课 / 待老师登记结果 | 查看安排；改期；取消当前预约 | 仅当自己是当前授课老师、课次未取消、课次已结束且有效预约 attendance=pending 时，可提交“已到课+反馈”或“缺席” | 已到课并提交反馈 → pending_followup；缺席 → pending_schedule；预约或课次取消 → pending_schedule。改期保留旧记录，并在同一流程下创建新的有效预约。 |
| **pending_followup** | 试听已完成，待跟进 | 查看教师反馈并联系家长；提交未联系上、家长考虑中、有报名意向或暂不考虑 | 无 | 未联系上/考虑中 → following_up，并设置未来 next_followup_at；有报名意向 → interested；暂不考虑 → closed。 |
| **following_up** | 持续跟进中 | 查看下次跟进时间；到 next_followup_at 后再次联系并提交跟进结果 | 无 | 未联系上/考虑中 → 保持 following_up 并更新未来 next_followup_at；有报名意向 → interested；暂不考虑 → closed。 |
| **interested** | 待办理报名 | 查看状态与历史跟进记录 | 无 | 试听跟进已结束并清空当前 next_followup_at；后续正式报名办理本期不实现，不提供继续推进状态的操作。 |
| **closed** | 已结束 | 查看最后一次跟进结果、关闭原因和历史记录 | 无 | 清空当前 next_followup_at；不提供任意修改状态或恢复流程的通用操作。 |

**工作台口径：**待安排数 = pending_schedule；已预约数 = scheduled；待跟进数 = pending_followup，或 following_up 且 next_followup_at 已到；待办理报名数 = interested。

**统一约束：**所有状态转换由服务端业务动作驱动，不提供任意修改 status 的通用接口。安排、反馈、取消和跟进须在事务内锁定 TrialCase、校验原状态；重复提交不得把后续阶段重置。

## 统一规则与验收关注点

- **权限与隐私：**管理员只能操作当前负责学生；教师只能处理当前 assigned_teacher_id 为自己的课次。学生卡片默认展示脱敏信息，完整字段、查看权限和审计要求待确认。
- **状态驱动：**界面操作由 TrialCase.status 和关联业务事实共同决定；不提供任意修改 status 的通用接口。所有转换校验原状态并在事务内更新。
- **时间规则：**业务时间使用 Australia/Melbourne。跟进时间默认次日 10:00；未联系上或考虑中必须填写未来的 next_followup_at。
- **基础数据：**Course、Class、ClassSession 使用 seed 导入；本期不提供基础数据管理、文件导入或周期排课生成器。
- **记录留痕：**预约、取消、缺席、教师反馈和 FollowUp 历史均保留；重复提交不得覆盖事实或把后续阶段重置。
- **异常与并发：**安排、改期、反馈、取消和跟进时锁定 TrialCase，并校验课次状态、资格、时间冲突和原流程状态；失败时不得产生部分状态更新。

## 尚未在来源中定义

1. 大表格是否需要搜索、筛选、分页、批量操作及对应空状态。
2. 学生卡片的脱敏字段、完整字段、查看权限、查看原因与审计要求。
3. 教师反馈与跟进摘要的必填字段、字数限制和输入模板。
4. 默认“次日 10:00”遇周末或节假日的处理方式，以及是否需要到期提醒。
