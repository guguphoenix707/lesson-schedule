import {
  getHttpErrorMessage,
  httpBase,
  isHttpForbidden,
  isHttpUnauthorized,
} from './http-base';
import type { TrialCaseStatus } from './students';

export type TeacherTrialTask = {
  id: string;
  studentId: string;
  studentDisplayName: string;
  trialCaseId: string;
  status: TrialCaseStatus;
  session: {
    id: string;
    startsAt: string;
    endsAt: string;
    className: string;
  };
};

export const teacherTrialTasksQueryKey = ['session-participants'] as const;

type TeacherTrialTaskListResponse = {
  items: TeacherTrialTask[];
};

export async function fetchTeacherTrialTasks(): Promise<TeacherTrialTask[]> {
  try {
    const { data } = await httpBase.get<TeacherTrialTaskListResponse>(
      '/session-participants',
    );
    return data.items;
  } catch (error) {
    if (isHttpUnauthorized(error)) {
      throw new Error('请先登录', { cause: error });
    }
    if (isHttpForbidden(error)) {
      throw new Error('没有权限查看试听跟踪', { cause: error });
    }
    throw new Error(getHttpErrorMessage(error, '无法加载试听跟踪'), {
      cause: error,
    });
  }
}
