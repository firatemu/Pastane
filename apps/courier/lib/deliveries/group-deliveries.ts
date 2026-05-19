import type { DeliveryListItem } from './types';

export type DeliveryGroupKey = 'active' | 'completedToday' | 'failedToday' | 'other';

const ACTIVE_STATUSES: DeliveryListItem['status'][] = ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'];

export function todayIstanbulKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function istanbulDateKeyFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function groupDeliveries(rows: DeliveryListItem[]): Record<DeliveryGroupKey, DeliveryListItem[]> {
  const today = todayIstanbulKey();
  const groups: Record<DeliveryGroupKey, DeliveryListItem[]> = {
    active: [],
    completedToday: [],
    failedToday: [],
    other: [],
  };

  for (const row of rows) {
    if (ACTIVE_STATUSES.includes(row.status)) {
      groups.active.push(row);
      continue;
    }
    if (row.status === 'DELIVERED') {
      const day = istanbulDateKeyFromIso(row.deliveredAt);
      if (day === today) groups.completedToday.push(row);
      else groups.other.push(row);
      continue;
    }
    if (row.status === 'FAILED') {
      const day = istanbulDateKeyFromIso(row.updatedAt);
      if (day === today) groups.failedToday.push(row);
      else groups.other.push(row);
      continue;
    }
    groups.other.push(row);
  }
  return groups;
}
