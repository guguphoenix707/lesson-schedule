import {
  getHttpErrorMessage,
  httpBase,
  isHttpForbidden,
  isHttpNotFound,
  isHttpUnauthorized,
} from './http-base';

export type TrialCaseStatus =
  | 'pending_schedule'
  | 'scheduled'
  | 'pending_followup'
  | 'following_up'
  | 'interested'
  | 'closed';

export type TrialAdminAction =
  | 'schedule'
  | 'reschedule'
  | 'cancel'
  | 'follow_up';

export type DerivedSessionLabel =
  | 'waiting_for_class'
  | 'awaiting_teacher_result';

export type StudentListItem = {
  id: string;
  displayName: string;
  trialCase: {
    id: string;
    status: TrialCaseStatus;
    derivedSessionLabel: DerivedSessionLabel | null;
    nextFollowupAt: string | null;
    allowedActions: TrialAdminAction[];
  } | null;
};

export type StudentDetail = {
  id: string;
  displayName: string;
  yearLevel: string;
  currentSchool: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  trial: {
    status: TrialCaseStatus;
    derivedSessionLabel: DerivedSessionLabel | null;
    requestedCourse: { id: string; name: string; nameEn: string } | null;
    preferredCampus: { id: string; name: string; nameZh: string } | null;
    concerns: string | null;
    submittedBy: 'student' | 'guardian';
    referralSource: string | null;
    nextFollowupAt: string | null;
    closedReason: string | null;
    currentSession: {
      startsAt: string;
      endsAt: string;
      className: string;
      teacherName: string;
      bookingStatus: string;
      attendance: string;
    } | null;
  } | null;
  primaryGuardian: {
    displayName: string;
    email: string;
    phone: string;
    relationship: string;
  } | null;
};

export const studentsQueryKey = ['students'] as const;

export function studentQueryKey(studentId: string) {
  return ['students', studentId] as const;
}

type StudentListResponse = {
  items: StudentListItem[];
};

export async function fetchStudents(): Promise<StudentListItem[]> {
  try {
    const { data } = await httpBase.get<StudentListResponse>('/students');
    return data.items;
  } catch (error) {
    if (isHttpUnauthorized(error)) {
      throw new Error('请先登录', { cause: error });
    }
    if (isHttpForbidden(error)) {
      throw new Error('没有权限查看学生任务', { cause: error });
    }
    throw new Error(getHttpErrorMessage(error, '无法加载学生任务'), {
      cause: error,
    });
  }
}

export async function fetchStudent(studentId: string): Promise<StudentDetail> {
  try {
    const { data } = await httpBase.get<StudentDetail>(
      `/students/${studentId}`,
    );
    return data;
  } catch (error) {
    if (isHttpUnauthorized(error)) {
      throw new Error('请先登录', { cause: error });
    }
    if (isHttpForbidden(error)) {
      throw new Error('没有权限查看该学生', { cause: error });
    }
    if (isHttpNotFound(error)) {
      throw new Error('学生不存在或不在你的名单中', { cause: error });
    }
    throw new Error(getHttpErrorMessage(error, '无法加载学生信息'), {
      cause: error,
    });
  }
}
