'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { can } from '../../lib/permissions/can';
import type { ProductSummary, SalesSummary } from '../../lib/operations/types';
import { MetricCard } from '../dashboard/metric-card';
import { PageSection } from '../shared/page-section';
import { ErrorState, LoadingState } from '../shared/async-state';
import { formatTry } from '../../lib/format/format-try';

/** API `GET /reports/products/summary` payload inside `data`. */
interface ProductsSummaryPayload {
  topProducts: Array<{
    productNameSnapshot: string;
    _sum: { quantity: number | bigint | null };
  }>;
}

function mapTopProducts(payload: ProductsSummaryPayload | null): ProductSummary[] {
  if (!payload?.topProducts?.length) return [];
  return payload.topProducts.map((row) => ({
    productNameSnapshot: row.productNameSnapshot,
    quantity: Number(row._sum?.quantity ?? 0),
  }));
}

export function ReportsSummary({ permissions }: { permissions: string[] }): React.JSX.Element {
  const [sales, setSales] = useState<SalesSummary | null>(null);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const buildQuery = useCallback((): string => {
    const qs = new URLSearchParams();
    if (startDate) qs.set('startDate', startDate);
    if (endDate) qs.set('endDate', endDate);
    const s = qs.toString();
    return s ? `?${s}` : '';
  }, [startDate, endDate]);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        setError(null);
        const [salesResult, productsPayload] = await Promise.all([
          can(permissions, ['reports.sales']) ? adminFetch<SalesSummary>('/reports/sales/summary') : Promise.resolve(null),
          can(permissions, ['reports.products'])
            ? adminFetch<ProductsSummaryPayload>('/reports/products/summary')
            : Promise.resolve(null),
        ]);
        setSales(salesResult);
        setProducts(mapTopProducts(productsPayload));
      } catch (caught) {
        setError(adminMessageFromUnknownError(caught, 'Raporlar yüklenemedi.'));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [permissions]);

  return (
    <PageSection title="Temel Raporlar" description="Tarih aralığı opsiyonel; boş bırakılırsa backend varsayılan aralığı kullanır.">
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-3xl border bg-white p-4">
        <label className="flex flex-col text-sm">
          <span className="text-stone-600">Başlangıç</span>
          <input
            type="date"
            className="mt-1 rounded-2xl border px-3 py-2"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
            }}
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="text-stone-600">Bitiş</span>
          <input
            type="date"
            className="mt-1 rounded-2xl border px-3 py-2"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
            }}
          />
        </label>
        <button
          type="button"
          className="rounded-2xl bg-stone-900 px-4 py-2 text-sm text-white"
          onClick={() => {
            setLoading(true);
            void (async () => {
              try {
                setError(null);
                const q = buildQuery();
                const [salesResult, productsPayload] = await Promise.all([
                  can(permissions, ['reports.sales']) ? adminFetch<SalesSummary>(`/reports/sales/summary${q}`) : Promise.resolve(null),
                  can(permissions, ['reports.products'])
                    ? adminFetch<ProductsSummaryPayload>(`/reports/products/summary${q}`)
                    : Promise.resolve(null),
                ]);
                setSales(salesResult);
                setProducts(mapTopProducts(productsPayload));
              } catch (caught) {
                setError(adminMessageFromUnknownError(caught, 'Raporlar yüklenemedi.'));
              } finally {
                setLoading(false);
              }
            })();
          }}
        >
          Uygula
        </button>
      </div>
      {loading ? (
        <LoadingState label="Raporlar yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <>
          {sales ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard label="Sipariş sayısı" value={String(sales.orderCount)} />
              <MetricCard label="Brüt satış" value={formatTry(sales.grossSales)} />
            </div>
          ) : null}
          {products.length ? (
            <section className="mt-6 rounded-3xl border bg-white p-5">
              <h2 className="font-semibold">En çok satan ürünler</h2>
              <div className="mt-4 space-y-2">
                {products.map((product) => (
                  <div className="flex justify-between text-sm" key={`${product.productNameSnapshot}-${product.quantity}`}>
                    <span>{product.productNameSnapshot}</span>
                    <span>{product.quantity}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <div className="mt-6 rounded-3xl border bg-white p-5 text-sm text-stone-600">Bu aralıkta raporlanacak ürün satışı yok.</div>
          )}
        </>
      )}
    </PageSection>
  );
}
