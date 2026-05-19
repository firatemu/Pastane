import { cookies } from 'next/headers';
import { AddressManager } from '../../../components/account/address-manager';
import type { Address } from '../../../lib/account/types';
import { apiFetch } from '../../../lib/api/client';
import { getCookieNames } from '../../../lib/auth/session';

export default async function AddressesPage(): Promise<React.JSX.Element> {
  const token = (await cookies()).get(getCookieNames().access)?.value ?? '';
  const addresses = await apiFetch<Address[]>('/api/v1/addresses', { headers: { Authorization: `Bearer ${token}` } });
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8"><section className="rounded-[2rem] border border-amber-200/70 bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Adreslerim</p><h1 className="mt-3 text-3xl font-semibold">Teslimat adresleri</h1><p className="mt-2 text-sm text-stone-600">Adreslerinizi ekleyebilir, varsayılan adresinizi seçebilir veya silebilirsiniz.</p></section><AddressManager initialAddresses={addresses} /></main>;
}
