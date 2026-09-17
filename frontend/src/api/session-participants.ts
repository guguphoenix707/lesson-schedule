import {
  getHttpErrorMessage,
  httpBase,
  isHttpConflict,
  isHttpForbidden,
  isHttpNotFound,
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

export type TeacherTrialAttendanceInput =
  | {
      attendance: 'present';
      teacherFeedback: {
        performance: string;
        fitSuggestion: string;
        questionsForAdmin?: string;
      };
    }
  | {
      attendance: 'absent';
      teacherFeedback?: {
        absentNote?: string;
      };
    };

export const teacherTrialTasksQueryKey = ['session-participants'] as const;

export function teacherTrialTaskQueryKey(participantId: string) {
  return ['session-participants', participantId] as const;
}

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

export async function fetchTeacherTrialTask(
  participantId: string,
): Promise<TeacherTrialTask> {
  try {
    const { data } = await httpBase.get<TeacherTrialTask>(
      `/session-participants/${participantId}`,
    );
    return data;
  } catch (error) {
    if (isHttpUnauthorized(error)) {
      throw new Error('请先登录', { cause: error });
    }
    if (isHttpForbidden(error)) {
      throw new Error('没有权限处理该试听', { cause: error });
    }
    if (isHttpNotFound(error)) {
      throw new Error(
        getHttpErrorMessage(error, '该试听不在待处理名单'),
        { cause: error },
      );
    }
    throw new Error(getHttpErrorMessage(error, '无法加载试听处理'), {
      cause: error,
    });
  }
}

export async function recordTeacherTrialAttendance(
  participantId: string,
  input: TeacherTrialAttendanceInput,
): Promise<void> {
  try {
    await httpBase.post(
      `/session-participants/${participantId}/attendance`,
      input,
    );
  } catch (error) {
    if (isHttpUnauthorized(error)) {
      throw new Error('请先登录', { cause: error });
    }
    if (isHttpForbidden(error)) {
      throw new Error('没有权限处理该试听', { cause: error });
    }
    if (isHttpNotFound(error)) {
      throw new Error(
        getHttpErrorMessage(error, '该试听不在待处理名单'),
        { cause: error },
      );
    }
    if (isHttpConflict(error)) {
      throw new Error(
        getHttpErrorMessage(error, '该试听已登记或当前不能处理'),
        { cause: error },
      );
    }
    throw new Error(getHttpErrorMessage(error, '无法登记试听结果'), {
      cause: error,
    });
  }
}
