import type { DerivedSessionLabel, TrialAdminAction, TrialCaseStatus } from '../api/students';

export const trialCaseStatusLabels: Record<TrialCaseStatus, string> = {
  pending_schedule: '待安排试听',
  scheduled: '已安排试听',
  pending_followup: '试听已完成，待跟进',
  following_up: '持续跟进中',
  interested: '待办理报名',
  closed: '已结束',
};

export const derivedSessionLabels: Record<DerivedSessionLabel, string> = {
  waiting_for_class: '等待上课',
  awaiting_teacher_result: '待老师登记结果',
};

export const trialAdminActionLabels: Record<TrialAdminAction, string> = {
  schedule: '安排试听',
  reschedule: '改期',
  cancel: '取消',
  follow_up: '处理',
};

export const trialCaseStatusColors: Record<TrialCaseStatus, string> = {
  pending_schedule: 'orange',
  scheduled: 'blue',
  pending_followup: 'gold',
  following_up: 'purple',
  interested: 'green',
  closed: 'default',
};
