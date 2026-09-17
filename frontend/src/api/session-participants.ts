import { httpBase } from './http-base';
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
  const { data } = await httpBase.get<TeacherTrialTaskListResponse>(
    '/session-participants',
  );
  return data.items;
}

export async function fetchTeacherTrialTask(
  participantId: string,
): Promise<TeacherTrialTask> {
  const { data } = await httpBase.get<TeacherTrialTask>(
    `/session-participants/${participantId}`,
  );
  return data;
}

export async function recordTeacherTrialAttendance(
  participantId: string,
  input: TeacherTrialAttendanceInput,
): Promise<void> {
  await httpBase.post(
    `/session-participants/${participantId}/attendance`,
    input,
  );
}
