export const STOCK_TIMEZONE = 'Europe/Istanbul';
const hhmmPattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isTimeWindowValid(from?: string, to?: string): boolean {
  if (!from && !to) return true;
  if (!from || !to || !hhmmPattern.test(from) || !hhmmPattern.test(to)) return false;
  return from < to;
}

export function windowsOverlap(aFrom?: string, aTo?: string, bFrom?: string, bTo?: string): boolean {
  const leftFrom = aFrom ?? '00:00';
  const leftTo = aTo ?? '24:00';
  const rightFrom = bFrom ?? '00:00';
  const rightTo = bTo ?? '24:00';
  return leftFrom < rightTo && rightFrom < leftTo;
}

export function timeFallsWithinWindow(time: string, from?: string, to?: string): boolean {
  if (!hhmmPattern.test(time)) return false;
  return (from ?? '00:00') <= time && time < (to ?? '24:00');
}

export function istanbulDay(value: string): Date {
  return new Date(`${value}T00:00:00.000+03:00`);
}
