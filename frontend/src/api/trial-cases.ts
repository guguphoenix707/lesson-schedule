import { httpBase } from './http-base';

export type SchedulableSession = {
  id: string;
  startsAt: string;
  endsAt: string;
  className: string;
  course: { id: string; name: string };
  teacher: { id: string; displayName: string };
};

export function schedulableSessionsQueryKey(trialCaseId: string) {
  return ['trial-cases', trialCaseId, 'schedulable-sessions'] as const;
}

type SchedulableSessionListResponse = {
  items: SchedulableSession[];
};

export async function fetchSchedulableSessions(
  trialCaseId: string,
): Promise<SchedulableSession[]> {
  const { data } = await httpBase.get<SchedulableSessionListResponse>(
    `/trial-cases/${trialCaseId}/schedulable-sessions`,
  );
  return data.items;
}

export async function scheduleTrialCase(
  trialCaseId: string,
  sessionId: string,
): Promise<void> {
  await httpBase.post(`/trial-cases/${trialCaseId}/schedule`, { sessionId });
}
