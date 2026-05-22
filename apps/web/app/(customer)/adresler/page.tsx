import { cookies } from 'next/headers';
import { AddressManager } from '../../../components/account/address-manager';
import type { Address } from '../../../lib/account/types';
import { apiFetch } from '../../../lib/api/client';
import { getCookieNames } from '../../../lib/auth/session';

export default async function AddressesPage(): Promise<React.JSX.Element> {
  const token = (await cookies()).get(getCookieNames().access)?.value ?? '';
  const addresses = await apiFetch<Address[]>('/api/v1/addresses', { headers: { Authorization: `Bearer ${token}` } });

  return (
    <main className="stitch-container space-y-6 py-10">
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-outline-soft/30 pb-6">
        <div>
          <p className="stitch-eyebrow">Adreslerim</p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-primary">Teslimat adresleri</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Kayıtlı adreslerinizi listeleyin; ekleme, düzenleme, varsayılan yapma ve silme işlemlerini buradan yönetin.
          </p>
        </div>
      </section>

      <AddressManager initialAddresses={addresses} />
    </main>
  );
}
