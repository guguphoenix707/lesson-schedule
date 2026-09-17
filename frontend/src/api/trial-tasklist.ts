import { httpBase } from './http-base';
import type {
  DerivedSessionLabel,
  TrialAdminAction,
  TrialCaseStatus,
} from './students';

export type TrialTasklistItem = {
  id: string;
  status: TrialCaseStatus;
  derivedSessionLabel: DerivedSessionLabel | null;
  nextFollowupAt: string | null;
  allowedActions: TrialAdminAction[];
  student: {
    id: string;
    displayName: string;
  };
  arrangement: {
    courseName: string;
    startsAt: string;
    endsAt: string;
  } | null;
};

export const trialTasklistQueryKey = ['trial-tasklist'] as const;

type TrialTasklistResponse = {
  items: TrialTasklistItem[];
};

export async function fetchTrialTasklist(): Promise<TrialTasklistItem[]> {
  const { data } = await httpBase.get<TrialTasklistResponse>(
    '/trial-tasklist',
  );
  return data.items;
}
