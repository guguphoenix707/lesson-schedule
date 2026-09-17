import { httpBase } from './http-base';

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

export function studentQueryKey(studentId: string) {
  return ['students', studentId] as const;
}

export async function fetchStudent(studentId: string): Promise<StudentDetail> {
  const { data } = await httpBase.get<StudentDetail>(
    `/students/${studentId}`,
  );
  return data;
}
