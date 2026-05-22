import type { JSX } from 'react';
import type { AdminUserRow } from '../../lib/operations/types';
import { BakeryStatCard } from '../dashboard/bakery-stat-card';

export function UsersStatsBar({ users }: Readonly<{ users: AdminUserRow[] }>): JSX.Element {
  const total = users.length;
  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
  const staffCount = users.filter((u) => u.role.name !== 'CUSTOMER').length;
  const bannedCount = users.filter((u) => u.status === 'BANNED').length;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <BakeryStatCard
        size="minimal"
        label="Toplam Kullanıcı"
        value={String(total)}
        iconGoogle="group"
        accent="surface"
      />
      <BakeryStatCard
        size="minimal"
        label="Aktif Kullanıcı"
        value={String(activeCount)}
        iconGoogle="check_circle"
        accent="tertiary"
      />
      <BakeryStatCard
        size="minimal"
        label="Yönetici & Personel"
        value={String(staffCount)}
        iconGoogle="shield"
        accent="secondary"
      />
      <BakeryStatCard
        size="minimal"
        label="Yasaklı Kullanıcı"
        value={String(bannedCount)}
        iconGoogle="block"
        accent="alert"
        emphasized={bannedCount > 0}
      />
    </div>
  );
}
