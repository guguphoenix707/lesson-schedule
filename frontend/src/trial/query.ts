import { includes, toLower, trim } from 'lodash-es';

export type TrialQueryBannerValue = {
  statuses: string[];
  studentName: string;
};

export type TrialQueryStatusOption = {
  label: string;
  value: string;
};

export const emptyTrialQuery: TrialQueryBannerValue = {
  statuses: [],
  studentName: '',
};

export function matchesTrialQuery(
  record: { studentName: string; status?: string | null },
  query: TrialQueryBannerValue,
): boolean {
  const { statuses, studentName } = query;
  if (statuses.length > 0 && !includes(statuses, record.status ?? '')) {
    return false;
  }

  const needle = trim(studentName);
  if (needle.length === 0) {
    return true;
  }

  return includes(toLower(record.studentName), toLower(needle));
}

export function isTrialQueryActive(query: TrialQueryBannerValue): boolean {
  return query.statuses.length > 0 || trim(query.studentName).length > 0;
}
