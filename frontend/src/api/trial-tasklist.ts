import {
  getHttpErrorMessage,
  httpBase,
  isHttpForbidden,
  isHttpUnauthorized,
} from './http-base';
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
};

export const trialTasklistQueryKey = ['trial-tasklist'] as const;

type TrialTasklistResponse = {
  items: TrialTasklistItem[];
};

export async function fetchTrialTasklist(): Promise<TrialTasklistItem[]> {
  try {
    const { data } = await httpBase.get<TrialTasklistResponse>(
      '/trial-tasklist',
    );
    return data.items;
  } catch (error) {
    if (isHttpUnauthorized(error)) {
      throw new Error('请先登录', { cause: error });
    }
    if (isHttpForbidden(error)) {
      throw new Error('没有权限查看试听待办', { cause: error });
    }
    throw new Error(getHttpErrorMessage(error, '无法加载试听待办'), {
      cause: error,
    });
  }
}
