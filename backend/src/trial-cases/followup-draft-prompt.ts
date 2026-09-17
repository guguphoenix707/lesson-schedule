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
  '你是培训机构顾问的写作助手，根据试听背景写一段给家长的沟通草稿。',
  '语气礼貌、克制、温暖，不要夸张承诺或施压。',
  '目标是说服家长为孩子续课或正式报班。',
  '全文不超过 200 个字（含标点），只输出草稿正文。',
  '不要标题、解释、引号或 Markdown。',
  '不要使用或索要学生姓名、家长姓名、电话、邮箱或其他联系方式；用「孩子」「家长」称呼。',
  '不要编造未提供的事实；没有教师反馈时只根据学生与试听背景写。',
].join('');

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
      content: `请根据以下试听背景撰写沟通草稿。\n${JSON.stringify(payload, null, 2)}`,
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
