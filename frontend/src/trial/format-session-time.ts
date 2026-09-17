const melbourneDateTime = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Australia/Melbourne',
  dateStyle: 'medium',
  timeStyle: 'short',
});

const melbourneDate = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Australia/Melbourne',
  dateStyle: 'medium',
});

const melbourneTime = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Australia/Melbourne',
  timeStyle: 'short',
});

const melbourneDateKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Australia/Melbourne',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function formatSessionTime(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (melbourneDate.format(start) === melbourneDate.format(end)) {
    return `${melbourneDateTime.format(start)} – ${melbourneTime.format(end)}`;
  }
  return `${melbourneDateTime.format(start)} – ${melbourneDateTime.format(end)}`;
}

export function sessionDateKey(startsAt: string): string {
  return melbourneDateKey.format(new Date(startsAt));
}

export function formatSessionDate(startsAt: string): string {
  return melbourneDate.format(new Date(startsAt));
}
