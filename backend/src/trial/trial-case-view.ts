import type { TrialCaseStatus } from '../generated/prisma/client';

export type TrialAdminAction =
  | 'schedule'
  | 'reschedule'
  | 'follow_up';

export type DerivedSessionLabel =
  | 'waiting_for_class'
  | 'awaiting_teacher_result';

export function allowedAdminActions(status: TrialCaseStatus): TrialAdminAction[] {
  switch (status) {
    case 'pending_schedule':
      return ['schedule'];
    case 'scheduled':
      return ['reschedule'];
    case 'pending_followup':
    case 'following_up':
      return ['follow_up'];
    default:
      return [];
  }
}

export function derivedSessionLabel(
  status: TrialCaseStatus,
  session:
    | { endsAt: Date; status: 'scheduled' | 'completed' | 'cancelled' }
    | undefined,
): DerivedSessionLabel | null {
  if (status !== 'scheduled' || !session || session.status === 'cancelled') {
    return null;
  }
  if (session.endsAt.getTime() <= Date.now()) {
    return 'awaiting_teacher_result';
  }
  return 'waiting_for_class';
}
