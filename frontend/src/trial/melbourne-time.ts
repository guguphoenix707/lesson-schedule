import { find } from 'lodash-es';

const melbourneTimeZone = 'Australia/Melbourne';

type MelbourneWallTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const dateTimeLocalPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function partNumber(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): number {
  const part = find(parts, (item) => item.type === type);
  return Number(part?.value ?? Number.NaN);
}

export function readMelbourneWallTime(date: Date): MelbourneWallTime {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: melbourneTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  return {
    year: partNumber(parts, 'year'),
    month: partNumber(parts, 'month'),
    day: partNumber(parts, 'day'),
    hour: partNumber(parts, 'hour'),
    minute: partNumber(parts, 'minute'),
  };
}

export function melbourneWallTimeToUtc(wall: MelbourneWallTime): Date {
  const wanted = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
  );
  let utc = wanted - 10 * 60 * 60 * 1000;
  for (let step = 0; step < 3; step += 1) {
    const shown = readMelbourneWallTime(new Date(utc));
    const shownAsUtc = Date.UTC(
      shown.year,
      shown.month - 1,
      shown.day,
      shown.hour,
      shown.minute,
    );
    utc += wanted - shownAsUtc;
  }
  return new Date(utc);
}

export function toDateTimeLocalValue(wall: MelbourneWallTime): string {
  return `${wall.year}-${pad2(wall.month)}-${pad2(wall.day)}T${pad2(wall.hour)}:${pad2(wall.minute)}`;
}

export function parseDateTimeLocalValue(
  value: string,
): MelbourneWallTime | null {
  const match = dateTimeLocalPattern.exec(value);
  if (!match) {
    return null;
  }
  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  return {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
    hour: Number(hourText),
    minute: Number(minuteText),
  };
}

export function melbourneDateTimeLocalToIso(value: string): string | null {
  const wall = parseDateTimeLocalValue(value);
  if (!wall) {
    return null;
  }
  return melbourneWallTimeToUtc(wall).toISOString();
}

export function melbourneNowLocalValue(now = new Date()): string {
  return toDateTimeLocalValue(readMelbourneWallTime(now));
}

export function defaultNextFollowupLocalValue(now = new Date()): string {
  const current = readMelbourneWallTime(now);
  const next = new Date(
    Date.UTC(current.year, current.month - 1, current.day + 1),
  );
  return toDateTimeLocalValue({
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
    hour: 10,
    minute: 0,
  });
}
