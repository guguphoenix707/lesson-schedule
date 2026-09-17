import type { LlmChatMessage } from '../llm/llm-client';

export const FOLLOWUP_DRAFT_MAX_CHARS = 200;
export const FOLLOWUP_DRAFT_MAX_OUTPUT_TOKENS = 400;

export type FollowupDraftLlmContext = {
  yearLevel: string;
  currentSchool: string | null;
  requestedCourse: string | null;
  preferredCampus: string | null;
  concerns: string | null;
  teacherFeedback: {
    className: string;
    teacherName: string;
    sessionTime: string;
    performance: string;
    fitSuggestion: string;
    questionsForAdmin: string | null;
  } | null;
};

const systemPrompt = [
  '你在帮培训机构顾问写一条发给家长的微信消息或者打电话的初步沟通草稿，不是通知、不是回访记录、也不是销售话术。',
  '读起来要像熟人轻声说话：口语、短句、有停顿，语气温暖、客气、不着急。',
  '先分享课堂上一个具体、温和的观察，再轻轻问问家长方不方便继续聊聊正式上课的安排。',
  '可以说「想邀请您一起看看后续怎么安排」，不要下结论、不要催报名。',
  '避免公文和套话，例如：尊敬的家长、特此、恳请、务必、办理手续、抓住窗口期、名额有限、强烈建议、表现优异。',
  '不要排比，不要口号，不要感叹号堆叠，不要写成报告或条列。',
  '用「您」称呼对方，用「孩子」指学生；不要写出或索要任何姓名、电话、邮箱。',
  '只根据给定事实写，不要编造没出现过的细节；没有教师反馈时，只根据年级、课程和家长关注点写。',
  '全文不超过 200 个字（含标点）。只输出消息正文，不要标题、解释、引号或 Markdown。',
].join('\n');

export function buildFollowupDraftMessages(
  context: FollowupDraftLlmContext,
): LlmChatMessage[] {
  const payload = {
    学生年级: redactSensitive(context.yearLevel),
    当前学校: context.currentSchool
      ? redactSensitive(context.currentSchool)
      : '未提供',
    意向课程: context.requestedCourse
      ? redactSensitive(context.requestedCourse)
      : '未提供',
    意向校区: context.preferredCampus
      ? redactSensitive(context.preferredCampus)
      : '未提供',
    家长关注点: context.concerns
      ? redactSensitive(context.concerns)
      : '未提供',
    教师反馈: context.teacherFeedback
      ? {
          试听课次: redactSensitive(context.teacherFeedback.className),
          授课老师: redactSensitive(context.teacherFeedback.teacherName),
          试听时间: context.teacherFeedback.sessionTime,
          表现评价: redactSensitive(context.teacherFeedback.performance),
          适配建议: redactSensitive(context.teacherFeedback.fitSuggestion),
          需顾问确认的问题: context.teacherFeedback.questionsForAdmin
            ? redactSensitive(context.teacherFeedback.questionsForAdmin)
            : '无',
        }
      : '暂无教师反馈',
  };

  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `请根据下面的试听背景，写一条顾问发给家长的微信草稿。\n${JSON.stringify(payload, null, 2)}`,
    },
  ];
}

export function normalizeFollowupDraft(text: string): string | null {
  let draft = text.replace(/\r\n/g, '\n').trim();
  draft = draft.replace(/^```(?:\w+)?\n?/, '').replace(/\n?```$/, '').trim();
  draft = draft.replace(/^["“「『]+/, '').replace(/["”」』]+$/, '').trim();
  draft = draft.replace(/^(?:沟通草稿|草稿)\s*[:：]\s*/, '');
  if (!draft) {
    return null;
  }

  const chars = Array.from(draft);
  if (chars.length > FOLLOWUP_DRAFT_MAX_CHARS) {
    draft = chars
      .slice(0, FOLLOWUP_DRAFT_MAX_CHARS)
      .join('')
      .replace(/[，。！？、；：,.!?;:\s]+$/u, '')
      .trim();
  }

  return draft.length > 0 ? draft : null;
}

export function formatMelbourneSession(startsAt: Date, endsAt: Date): string {
  const dateLabel = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).format(startsAt);
  const timeFormat = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Australia/Melbourne',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return `${dateLabel} ${timeFormat.format(startsAt)}–${timeFormat.format(endsAt)}`;
}

function redactSensitive(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[已省略]')
    .replace(/\+?\d[\d\s()-]{7,}\d/g, '[已省略]');
}
