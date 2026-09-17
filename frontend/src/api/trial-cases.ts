import { httpBase } from './http-base';
import type { TrialCaseStatus } from './students';

export type FollowUpOutcome =
  | 'unreachable'
  | 'considering'
  | 'interested'
  | 'not_interested';

export type TrialTeacherFeedback = {
  performance: string;
  fitSuggestion: string;
  questionsForAdmin: string | null;
  session: {
    startsAt: string;
    endsAt: string;
    className: string;
    teacherName: string;
  };
};

export type TrialFollowUpRecord = {
  id: string;
  outcome: FollowUpOutcome;
  summary: string | null;
  nextFollowupAt: string | null;
  createdAt: string;
  authorName: string;
};

export type TrialFollowupDetail = {
  id: string;
  status: TrialCaseStatus;
  nextFollowupAt: string | null;
  followupDraft: string | null;
  closedReason: string | null;
  student: { id: string; displayName: string };
  teacherFeedback: TrialTeacherFeedback | null;
  followUps: TrialFollowUpRecord[];
};

export type CreateFollowUpInput =
  | {
      outcome: 'unreachable';
      summary?: string;
      nextFollowupAt: string;
    }
  | {
      outcome: 'considering';
      summary: string;
      nextFollowupAt: string;
    }
  | {
      outcome: 'interested';
      summary: string;
    }
  | {
      outcome: 'not_interested';
      summary: string;
      closedReason: string;
    };

export type SchedulableSession = {
  id: string;
  startsAt: string;
  endsAt: string;
  className: string;
  course: { id: string; name: string };
  teacher: { id: string; displayName: string };
};

export type SchedulableSessionsPayload = {
  student: { id: string; displayName: string };
  items: SchedulableSession[];
};

export function schedulableSessionsQueryKey(trialCaseId: string) {
  return ['trial-cases', trialCaseId, 'schedulable-sessions'] as const;
}

export async function fetchSchedulableSessions(
  trialCaseId: string,
): Promise<SchedulableSessionsPayload> {
  const { data } = await httpBase.get<SchedulableSessionsPayload>(
    `/trial-cases/${trialCaseId}/schedulable-sessions`,
  );
  return data;
}

export async function scheduleTrialCase(
  trialCaseId: string,
  sessionId: string,
): Promise<void> {
  await httpBase.post(`/trial-cases/${trialCaseId}/schedule`, { sessionId });
}

export function trialFollowupQueryKey(trialCaseId: string) {
  return ['trial-cases', trialCaseId] as const;
}

export async function fetchTrialFollowup(
  trialCaseId: string,
): Promise<TrialFollowupDetail> {
  const { data } = await httpBase.get<TrialFollowupDetail>(
    `/trial-cases/${trialCaseId}`,
  );
  return data;
}

export async function saveTrialFollowupDraft(
  trialCaseId: string,
  followupDraft: string,
): Promise<void> {
  await httpBase.post(`/trial-cases/${trialCaseId}/followup-draft`, {
    followupDraft,
  });
}

export async function createTrialFollowUp(
  trialCaseId: string,
  input: CreateFollowUpInput,
): Promise<void> {
  await httpBase.post(`/trial-cases/${trialCaseId}/follow-ups`, input);
}
