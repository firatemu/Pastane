import { randomUUID } from 'crypto';
export function createOrderNumber(now = new Date(), suffix = randomUUID().slice(0, 6).toUpperCase()): string {
  const stamp = now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `ORD-${stamp}-${suffix}`;
}
