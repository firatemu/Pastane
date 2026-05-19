'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import type { Product, StockEntry } from '../../lib/catalog/types';
import { can } from '../../lib/permissions/can';
import { ErrorState, LoadingState } from '../shared/async-state';

function formatWindow(entry: StockEntry): string {
  if (entry.availableFrom && entry.availableTo) return `${entry.availableFrom} – ${entry.availableTo} (Europe/Istanbul)`;
  if (entry.availableFrom || entry.availableTo) return `${entry.availableFrom ?? '—'} – ${entry.availableTo ?? '—'}`;
  return 'Tüm gün (saat sınırı yok)';
}

export function ProductStockPanel({ product, permissions }: Readonly<{ product: Product; permissions: string[] }>): React.JSX.Element | null {
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canViewStock = can(permissions, ['stock.view']);

  useEffect(() => {
    if (!canViewStock) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await adminFetch<StockEntry[]>(`/stock/product/${product.id}`);
        if (!cancelled) setEntries(data);
      } catch (caught) {
        if (!cancelled) setError(adminMessageFromUnknownError(caught, 'Ürün stokları yüklenemedi.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [product.id, canViewStock]);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date) || (a.availableFrom ?? '').localeCompare(b.availableFrom ?? '')),
    [entries],
  );

  if (!canViewStock) return null;

  return (
    <section className="space-y-4 rounded-3xl border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Stok ve satış pencereleri</h2>
          <p className="mt-1 text-sm text-stone-600">
            Vitrinden sipariş, bu ürün için sipariş anındaki <strong>takvim günü</strong> ve <strong>İstanbul saati</strong> ile örtüşen bir stok
            satırı gerektirir. Saat boş bırakılan satırlar gün boyunca geçerlidir. Çakışan pencereler API tarafından reddedilir.
          </p>
        </div>
        {can(permissions, ['stock.create', 'stock.update']) ? (
          <Link
            className="shrink-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
            href="/stock"
          >
            Stok yönetimine git
          </Link>
        ) : null}
      </div>

      {loading ? (
        <LoadingState label="Stok satırları yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
          Bu ürün için kayıtlı stok satırı yok. Satışın kesilmemesi için <Link href="/stock">Stok</Link> sayfasından tarih ve isteğe bağlı saat
          penceresiyle giriş ekleyin.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Pencere</th>
                <th className="px-4 py-3">Adet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sorted.map((entry) => (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-stone-900">{entry.date.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-stone-700">{formatWindow(entry)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-stone-900">{entry.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
