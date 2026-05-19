import type { LoyaltyMovement } from './types';

export function loyaltyMovementLabel(type: LoyaltyMovement['type']): string {
  const map: Record<LoyaltyMovement['type'], string> = {
    EARN: 'Kazanım',
    REDEEM: 'Kullanım',
    ADJUSTMENT: 'Düzeltme',
  };
  return map[type] ?? type;
}

export function customerAccountStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'Aktif',
    INACTIVE: 'Pasif',
    SUSPENDED: 'Askıda',
  };
  return map[status] ?? status;
}
