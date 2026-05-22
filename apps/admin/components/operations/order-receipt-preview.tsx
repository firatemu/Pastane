'use client';

import { useEffect, useMemo, useState } from 'react';

import { adminFetch } from '../../lib/api/catalog';
import { formatTry } from '../../lib/format/format-try';
import { formatAddressSnapshot } from '../../lib/maps/format-address-snapshot';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { DELIVERY_TYPE_LABELS } from '../../lib/operations/status';
import type { OrderDetail, OrderListItem } from '../../lib/operations/types';
import { ErrorState, LoadingState } from '../shared/async-state';

type ReceiptMode = 'receipt' | 'label';

export function OrderReceiptPreview({
  orderId,
  summary,
  onClose,
}: {
  orderId: string;
  summary?: OrderListItem | null;
  onClose: () => void;
}): React.JSX.Element {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ReceiptMode>('receipt');

  useEffect(() => {
    let cancelled = false;
    setOrder(null);
    setError(null);

    async function load(): Promise<void> {
      try {
        const next = await adminFetch<OrderDetail>(`/orders/${orderId}`);
        if (!cancelled) setOrder(next);
      } catch (caught) {
        if (!cancelled) setError(adminMessageFromUnknownError(caught, 'Fiş bilgisi yüklenemedi.'));
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const printTitle = summary?.orderNumber ?? order?.orderNumber ?? 'Sipariş fişi';

  function printReceipt(): void {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 px-4 py-6 print:static print:bg-white print:p-0">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[340px_minmax(0,1fr)] print:block print:max-w-none">
        <section className="thermal-print-modal-chrome rounded-card border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-bakery">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-on-surface">
                Fiş ön izleme
              </h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Sipariş çıktısını kontrol edin, fiş veya etiket görünümünü seçip yazdırın.
              </p>
            </div>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
              type="button"
              onClick={onClose}
            >
              Kapat
            </button>
          </div>

          <div className="mt-6 grid gap-3">
            <button
              className={`rounded-xl border px-4 py-4 text-left text-sm transition ${
                mode === 'receipt'
                  ? 'border-secondary bg-secondary-container text-on-secondary-container'
                  : 'border-outline-variant bg-surface-container-lowest text-on-surface'
              }`}
              type="button"
              onClick={() => setMode('receipt')}
            >
              <span className="block font-semibold">Fiş</span>
              <span className="mt-1 block text-xs opacity-75">Kalemler, ödeme, adres ve not.</span>
            </button>
            <button
              className={`rounded-xl border px-4 py-4 text-left text-sm transition ${
                mode === 'label'
                  ? 'border-secondary bg-secondary-container text-on-secondary-container'
                  : 'border-outline-variant bg-surface-container-lowest text-on-surface'
              }`}
              type="button"
              onClick={() => setMode('label')}
            >
              <span className="block font-semibold">Etiket</span>
              <span className="mt-1 block text-xs opacity-75">Kurye ve paket üstü kısa bilgi.</span>
            </button>
          </div>

          <button
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-on-secondary shadow-bakery transition hover:bg-tertiary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!order}
            type="button"
            onClick={printReceipt}
          >
            <span className="material-symbols-outlined text-[20px]">print</span>
            Yazdır
          </button>
        </section>

        <section className="rounded-card border border-outline-variant/40 bg-surface-container-low p-4 shadow-bakery print:border-0 print:bg-white print:p-0 print:shadow-none">
          <div className="thermal-print-modal-chrome mb-4 flex items-center justify-between gap-3 text-sm text-on-surface-variant">
            <span>Ön izleme: {printTitle}</span>
            <span className="rounded-full bg-surface-container-lowest px-3 py-1 text-xs font-semibold">
              {mode === 'receipt' ? 'Fiş' : 'Etiket'}
            </span>
          </div>

          {error ? <ErrorState message={error} /> : null}
          {!error && !order ? <LoadingState label="Fiş hazırlanıyor…" /> : null}
          {order ? <ThermalReceipt order={order} mode={mode} /> : null}
        </section>
      </div>
    </div>
  );
}

function ThermalReceipt({
  mode,
  order,
}: {
  mode: ReceiptMode;
  order: OrderDetail;
}): React.JSX.Element {
  const createdAt = new Date(order.createdAt).toLocaleString('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  const customer = `${order.user.firstName} ${order.user.lastName}`;
  const paymentStatus = order.payments?.[0]?.status ?? 'Bilinmiyor';
  const totals = useReceiptTotals(order);
  const deliveryLabel = DELIVERY_TYPE_LABELS[order.deliveryType] ?? order.deliveryType;

  return (
    <article className="thermal-receipt-print mx-auto w-[80mm] bg-white p-[4mm] font-mono text-[11px] leading-tight text-black shadow-bakery print:mx-0 print:shadow-none">
      <header className="text-center">
        <p className="text-[15px] font-black tracking-wide">PASTANE</p>
        <p className="mt-1">Siparis Fisi</p>
      </header>

      <ReceiptRule />

      <div className="space-y-1">
        <ReceiptRow label="Siparis" value={order.orderNumber} strong />
        <ReceiptRow label="Tarih" value={createdAt} />
        <ReceiptRow label="Teslimat" value={deliveryLabel} />
        <ReceiptRow label="Odeme" value={formatPaymentStatus(paymentStatus)} />
      </div>

      <ReceiptRule />

      <section className="space-y-1">
        <p className="font-bold uppercase">Musteri</p>
        <p>{customer}</p>
        <p>{order.user.phone}</p>
      </section>

      {mode === 'label' ? (
        <>
          <ReceiptRule />
          <section className="space-y-1 text-[12px]">
            <p className="font-bold uppercase">Adres / Teslimat</p>
            <p>{formatDestination(order)}</p>
            {order.note ? <p className="mt-2 font-bold">Not: {order.note}</p> : null}
          </section>
          <ReceiptRule />
          <p className="text-center text-[17px] font-black tracking-widest">{shortOrderCode(order.orderNumber)}</p>
        </>
      ) : (
        <>
          <ReceiptRule />
          <section>
            <div className="grid grid-cols-[1fr_28px_52px] gap-1 pb-1 text-[10px] font-bold uppercase">
              <span>Urun</span>
              <span className="text-right">Ad</span>
              <span className="text-right">Tutar</span>
            </div>
            <div className="space-y-2">
              {order.items.map((item) => {
                const lineTotal = orderLineTotal(item);
                return (
                  <div key={item.id}>
                    <div className="grid grid-cols-[1fr_28px_52px] gap-1">
                      <span className="font-bold">{item.productNameSnapshot}</span>
                      <span className="text-right">{item.quantity}</span>
                      <span className="text-right">{formatTry(lineTotal)}</span>
                    </div>
                    <p className="text-[10px]">Birim: {formatTry(item.unitPriceSnapshot)}</p>
                    {item.options.length > 0 ? (
                      <ul className="mt-1 space-y-0.5 text-[10px]">
                        {item.options.map((option) => (
                          <li key={`${item.id}-${option.optionNameSnapshot}`}>
                            + {option.optionNameSnapshot}
                            {Number(option.priceModifierSnapshot) > 0
                              ? ` (${formatTry(option.priceModifierSnapshot)})`
                              : ''}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <ReceiptRule />

          <section className="space-y-1">
            <ReceiptRow label="Ara toplam" value={formatTry(totals.subtotal)} />
            {totals.deliveryFee > 0 ? (
              <ReceiptRow label="Teslimat" value={formatTry(totals.deliveryFee)} />
            ) : null}
            {totals.serviceFee > 0 ? <ReceiptRow label="Hizmet" value={formatTry(totals.serviceFee)} /> : null}
            {totals.loyaltyDiscount > 0 ? (
              <ReceiptRow label="Indirim" value={`-${formatTry(totals.loyaltyDiscount)}`} />
            ) : null}
            <ReceiptRow label="Genel toplam" value={formatTry(order.grandTotal)} strong />
          </section>

          <ReceiptRule />

          <section className="space-y-1">
            <p className="font-bold uppercase">Teslimat bilgisi</p>
            <p>{formatDestination(order)}</p>
            {order.note ? <p className="mt-2 font-bold">Siparis notu: {order.note}</p> : null}
          </section>
        </>
      )}

      <ReceiptRule />

      <footer className="text-center text-[10px]">
        <p>Hazirlayan: Pastane Admin</p>
        <p className="mt-1">{new Date().toLocaleString('tr-TR')}</p>
      </footer>
    </article>
  );
}

function useReceiptTotals(order: OrderDetail): {
  deliveryFee: number;
  loyaltyDiscount: number;
  serviceFee: number;
  subtotal: number;
} {
  return useMemo(() => {
    const computedSubtotal = order.items.reduce((sum, item) => sum + orderLineTotal(item), 0);
    return {
      deliveryFee: Number(order.deliveryFee ?? 0),
      loyaltyDiscount: Number(order.loyaltyDiscount ?? 0),
      serviceFee: Number(order.serviceFee ?? 0),
      subtotal: Number(order.subtotal ?? computedSubtotal),
    };
  }, [order]);
}

function orderLineTotal(item: OrderDetail['items'][number]): number {
  const unit = Number(item.unitPriceSnapshot ?? 0);
  const optionSum = item.options.reduce((sum, option) => sum + Number(option.priceModifierSnapshot ?? 0), 0);
  return (unit + optionSum) * item.quantity;
}

function ReceiptRule(): React.JSX.Element {
  return <div className="my-2 border-t border-dashed border-black" />;
}

function ReceiptRow({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}): React.JSX.Element {
  return (
    <div className={`flex justify-between gap-2 ${strong ? 'text-[12px] font-black' : ''}`}>
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function formatDestination(order: OrderDetail): string {
  if (order.deliveryType === 'PICKUP') {
    return order.pickupStore?.name ? `Magazadan teslim: ${order.pickupStore.name}` : 'Magazadan teslim';
  }
  return formatAddressSnapshot(order.addressSnapshot);
}

function formatPaymentStatus(status: string): string {
  const labels: Record<string, string> = {
    FAILED: 'Basarisiz',
    PAID: 'Odendi',
    PENDING: 'Bekliyor',
    REFUNDED: 'Iade',
    SUCCESS: 'Odeme tamam',
    SUCCEEDED: 'Odeme tamam',
  };
  return labels[status] ?? status;
}

function shortOrderCode(orderNumber: string): string {
  const clean = orderNumber.replace(/[^A-Z0-9]/gi, '');
  return clean.slice(-8).toUpperCase();
}
