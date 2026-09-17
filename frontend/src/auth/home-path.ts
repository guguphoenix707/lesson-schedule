import type { StaffSession } from '../api/auth';

export function homePathFor(role: StaffSession['role']): string {
  return role === 'admin' ? '/trial-tasklist' : '/teacher/trial-task/list';
}
