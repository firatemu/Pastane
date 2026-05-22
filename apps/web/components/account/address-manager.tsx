'use client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { Address } from '../../lib/account/types';
import {
  customerFacingMessageFromUnknownError,
  messageFromCustomerApiPayload,
  type ParsedCustomerApiPayload,
} from '../../lib/messages/customer-facing-errors';

const AddressMapPicker = dynamic(
  () => import('../maps/address-map-picker').then((m) => m.AddressMapPicker),
  { ssr: false },
);

type ApiPayload<T> = ParsedCustomerApiPayload & { data?: T };

type AddressForm = {
  title: string;
  city: string;
  district: string;
  neighborhood: string;
  fullAddress: string;
  building: string;
  floor: string;
  apartment: string;
  directions: string;
  latitude: number | null;
  longitude: number | null;
  mapAddress: string;
  isDefault: boolean;
};

const emptyForm: AddressForm = {
  title: '',
  city: 'Mersin',
  district: '',
  neighborhood: '',
  fullAddress: '',
  building: '',
  floor: '',
  apartment: '',
  directions: '',
  latitude: null,
  longitude: null,
  mapAddress: '',
  isDefault: false,
};

/** API bazen koordinatları sayı dışında iletebilir; harita için tek tip sayı kullanıyoruz. */
function parseCoordinate(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function hasStoredCoordinates(address: Pick<Address, 'latitude' | 'longitude'>): boolean {
  return parseCoordinate(address.latitude) !== null && parseCoordinate(address.longitude) !== null;
}

function formFromAddress(address: Address): AddressForm {
  return {
    title: address.title,
    city: address.city,
    district: address.district,
    neighborhood: address.neighborhood ?? '',
    fullAddress: address.fullAddress,
    building: address.building ?? '',
    floor: address.floor ?? '',
    apartment: address.apartment ?? '',
    directions: address.directions ?? '',
    latitude: parseCoordinate(address.latitude),
    longitude: parseCoordinate(address.longitude),
    mapAddress: address.mapAddress ?? '',
    isDefault: address.isDefault,
  };
}

function hasValidMapPin(form: AddressForm): boolean {
  return (
    typeof form.latitude === 'number' &&
    typeof form.longitude === 'number' &&
    Number.isFinite(form.latitude) &&
    Number.isFinite(form.longitude)
  );
}

function payload(form: AddressForm): Record<string, unknown> {
  return {
    title: form.title,
    city: form.city,
    district: form.district,
    neighborhood: form.neighborhood || undefined,
    fullAddress: form.fullAddress,
    building: form.building || undefined,
    floor: form.floor || undefined,
    apartment: form.apartment || undefined,
    directions: form.directions || undefined,
    /** JSON.stringify undefined anahtarı düşürür; tek eksik koordinat `assertLatitudeLongitudeConsistency` ile 400 üretir. */
    latitude: form.latitude ?? null,
    longitude: form.longitude ?? null,
    mapAddress: form.mapAddress.trim() || undefined,
    isDefault: form.isDefault || undefined,
  };
}

export function AddressManager({
  initialAddresses,
}: Readonly<{ initialAddresses: Address[] }>): React.JSX.Element {
  const router = useRouter();
  const [addresses, setAddresses] = useState(initialAddresses);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AddressForm>(emptyForm);
  const [sheetOpen, setSheetOpen] = useState(false);
  const editingAddress = editingId ? addresses.find((address) => address.id === editingId) ?? null : null;

  async function reload(): Promise<void> {
    const response = await fetch('/api/addresses', { cache: 'no-store' });
    const body = await response.json() as ApiPayload<Address[]>;
    setAddresses(body.data ?? []);
    router.refresh();
  }

  async function create(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    if (!hasValidMapPin(form)) {
      setMessage('Lütfen haritadan teslimat konumunu seçin.');
      setBusy(false);
      return;
    }
    try {
      const response = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload(form)),
      });
      const body = await response.json() as ApiPayload<Address>;
      if (!response.ok || !body.data) {
        throw new Error(messageFromCustomerApiPayload(response.status, body, 'Adres eklenemedi.'));
      }
      setForm(emptyForm);
      setMessage('Adres eklendi.');
      closeSheet();
      await reload();
    } catch (error) {
      setMessage(customerFacingMessageFromUnknownError(error, 'Adres eklenemedi.'));
    } finally {
      setBusy(false);
    }
  }

  async function update(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!editingId) return;
    setBusy(true);
    setMessage(null);
    if (!hasValidMapPin(editForm)) {
      setMessage('Lütfen haritadan teslimat konumunu seçin.');
      setBusy(false);
      return;
    }
    try {
      const response = await fetch(`/api/addresses/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload(editForm)),
      });
      const body = await response.json() as ApiPayload<Address>;
      if (!response.ok || !body.data) {
        throw new Error(messageFromCustomerApiPayload(response.status, body, 'Adres güncellenemedi.'));
      }
      setEditingId(null);
      setMessage('Adres güncellendi.');
      closeSheet();
      await reload();
    } catch (error) {
      setMessage(customerFacingMessageFromUnknownError(error, 'Adres güncellenemedi.'));
    } finally {
      setBusy(false);
    }
  }

  async function setDefault(id: string): Promise<void> {
    setBusy(true);
    try {
      await fetch(`/api/addresses/${id}/default`, { method: 'PATCH' });
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string): Promise<void> {
    setBusy(true);
    try {
      await fetch(`/api/addresses/${id}`, { method: 'DELETE' });
      await reload();
    } finally {
      setBusy(false);
    }
  }

  function openCreate(): void {
    setEditingId(null);
    setForm(emptyForm);
    setSheetOpen(true);
  }

  function openEdit(address: Address): void {
    setEditingId(address.id);
    setEditForm(formFromAddress(address));
    setSheetOpen(true);
  }

  function closeSheet(): void {
    setSheetOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setEditForm(emptyForm);
  }

  function addressFields(current: AddressForm, setCurrent: (value: AddressForm) => void): React.JSX.Element {
    return (
      <div className="mt-6 space-y-6 text-sm">
        <section className="rounded-2xl border border-outline-soft/40 bg-surface-low p-4">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Adres kimliği</p>
            <p className="mt-1 text-xs text-muted">Adresin sipariş ve operasyon ekranlarında nasıl görüneceğini belirler.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="font-semibold text-ink">Adres başlığı</span>
              <input
                className="w-full rounded-xl border border-outline-soft/60 bg-white px-4 py-3 outline-none focus:border-primary"
                placeholder="Ev, Ofis, Merkez Şube"
                value={current.title}
                onChange={(e) => setCurrent({ ...current, title: e.target.value })}
                required
              />
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-outline-soft/60 bg-white px-4 py-3">
              <input
                type="checkbox"
                checked={current.isDefault}
                onChange={(e) => setCurrent({ ...current, isDefault: e.target.checked })}
              />
              <span className="font-semibold text-ink">Varsayılan teslimat adresi</span>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-outline-soft/40 bg-white p-4">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Konum bilgileri</p>
            <p className="mt-1 text-xs text-muted">Teslimat bölgesi, kurye planlama ve ödeme adımı için kullanılır.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="font-semibold text-ink">İl</span>
              <input
                className="w-full rounded-xl border border-outline-soft/60 bg-white px-4 py-3 outline-none focus:border-primary"
                placeholder="İl"
                value={current.city}
                onChange={(e) => setCurrent({ ...current, city: e.target.value })}
                required
              />
            </label>
            <label className="space-y-2">
              <span className="font-semibold text-ink">İlçe</span>
              <input
                className="w-full rounded-xl border border-outline-soft/60 bg-white px-4 py-3 outline-none focus:border-primary"
                placeholder="İlçe"
                value={current.district}
                onChange={(e) => setCurrent({ ...current, district: e.target.value })}
                required
              />
            </label>
            <label className="space-y-2">
              <span className="font-semibold text-ink">Mahalle</span>
              <input
                className="w-full rounded-xl border border-outline-soft/60 bg-white px-4 py-3 outline-none focus:border-primary"
                placeholder="Mahalle"
                value={current.neighborhood}
                onChange={(e) => setCurrent({ ...current, neighborhood: e.target.value })}
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-outline-soft/40 bg-white p-4">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Kapı ve yönlendirme</p>
            <p className="mt-1 text-xs text-muted">Kurye teslimatı için bina, kat, daire ve yön tarifi bilgilerini girin.</p>
          </div>
          <textarea
            className="min-h-24 w-full rounded-xl border border-outline-soft/60 bg-white px-4 py-3 outline-none focus:border-primary"
            placeholder="Açık adres"
            value={current.fullAddress}
            onChange={(e) => setCurrent({ ...current, fullAddress: e.target.value })}
            required
          />
          <div className="mt-4 grid grid-cols-3 gap-3">
            <input
              className="rounded-xl border border-outline-soft/60 px-3 py-3 outline-none focus:border-primary"
              placeholder="Bina"
              value={current.building}
              onChange={(e) => setCurrent({ ...current, building: e.target.value })}
            />
            <input
              className="rounded-xl border border-outline-soft/60 px-3 py-3 outline-none focus:border-primary"
              placeholder="Kat"
              value={current.floor}
              onChange={(e) => setCurrent({ ...current, floor: e.target.value })}
            />
            <input
              className="rounded-xl border border-outline-soft/60 px-3 py-3 outline-none focus:border-primary"
              placeholder="Daire"
              value={current.apartment}
              onChange={(e) => setCurrent({ ...current, apartment: e.target.value })}
            />
          </div>
          <textarea
            className="mt-4 min-h-20 w-full rounded-xl border border-outline-soft/60 bg-white px-4 py-3 outline-none focus:border-primary"
            placeholder="Adres tarifi, güvenlik notu, kapı kodu"
            value={current.directions}
            onChange={(e) => setCurrent({ ...current, directions: e.target.value })}
          />
        </section>

        <section className="rounded-2xl border border-outline-soft/40 bg-white p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Harita doğrulaması</p>
              <p className="mt-1 text-xs text-muted">Teslim noktasını haritadan işaretleyin.</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${hasValidMapPin(current) ? 'bg-primary-fixed text-primary' : 'bg-honey/40 text-secondary'}`}>
              {hasValidMapPin(current) ? 'Konum seçildi' : 'Konum bekliyor'}
            </span>
          </div>
          <AddressMapPicker
            latitude={current.latitude}
            longitude={current.longitude}
            onCoordinatesChange={({ latitude, longitude, mapAddress }) =>
              setCurrent({ ...current, latitude, longitude, mapAddress })
            }
          />
          {current.mapAddress ? <p className="mt-3 rounded-xl bg-surface-low px-3 py-2 text-xs text-muted">{current.mapAddress}</p> : null}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message ? (
        <p className="rounded-2xl border border-honey/60 bg-honey/20 px-4 py-3 text-sm font-medium text-secondary">
          {message}
        </p>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="rounded-full bg-surface-low px-4 py-2 text-sm font-semibold text-muted">{addresses.length} kayıtlı adres</span>
          <button className="stitch-button" type="button" onClick={openCreate}>
            Yeni adres ekle
          </button>
        </div>
        {!addresses.length ? (
          <div className="stitch-panel rounded-3xl p-8 text-center">
            <h3 className="font-display text-2xl font-semibold text-primary">Kayıtlı adres yok</h3>
            <p className="mt-2 text-sm text-muted">İlk teslimat noktasını sağdan açılan panelden ekleyin.</p>
            <button className="stitch-button mt-5" type="button" onClick={openCreate}>
              Adres ekle
            </button>
          </div>
        ) : (
          addresses.map((address) => (
            <article className="stitch-panel rounded-3xl p-5" key={address.id}>
              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-2xl font-semibold text-primary">{address.title}</h2>
                    {address.isDefault ? (
                      <span className="rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold text-primary">
                        Varsayılan
                      </span>
                    ) : null}
                  </div>
                  <p
                    className={
                      hasStoredCoordinates(address)
                        ? 'mt-3 inline-flex rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold text-primary'
                        : 'mt-3 inline-flex rounded-full bg-honey/40 px-3 py-1 text-xs font-semibold text-secondary'
                    }
                  >
                    {hasStoredCoordinates(address) ? 'Harita konumu seçildi' : 'Harita konumu eksik'}
                  </p>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">{address.fullAddress}</p>
                  <p className="mt-1 text-sm font-medium text-ink">
                    {address.neighborhood ? `${address.neighborhood} · ` : ''}
                    {address.district} / {address.city}
                  </p>
                  {address.building || address.floor || address.apartment ? (
                    <p className="mt-1 text-sm text-muted">
                      Bina {address.building ?? '-'} · Kat {address.floor ?? '-'} · Daire {address.apartment ?? '-'}
                    </p>
                  ) : null}
                  {address.directions ? (
                    <p className="mt-3 rounded-2xl bg-surface-low px-4 py-3 text-sm text-muted">Tarif: {address.directions}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                    <button
                      className="rounded-full border border-outline-soft/60 px-4 py-2 text-xs font-semibold text-primary hover:border-primary"
                      disabled={busy}
                      onClick={() => openEdit(address)}
                      type="button"
                    >
                      Düzenle
                    </button>
                    {!address.isDefault ? (
                      <button
                        className="rounded-full border border-outline-soft/60 px-4 py-2 text-xs font-semibold text-muted hover:border-primary hover:text-primary"
                        disabled={busy}
                        onClick={() => void setDefault(address.id)}
                        type="button"
                      >
                        Varsayılan yap
                      </button>
                    ) : null}
                    <button
                      className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-700"
                      disabled={busy}
                      onClick={() => void remove(address.id)}
                      type="button"
                    >
                      Sil
                    </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      {sheetOpen ? (
        <>
          <button
            type="button"
            aria-label="Adres panelini kapat"
            className="fixed inset-0 z-[60] bg-black/25 backdrop-blur-[2px]"
            onClick={closeSheet}
          />
          <aside
            className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-xl flex-col border-l border-outline-soft/50 bg-surface-lowest shadow-ambient"
            role="dialog"
            aria-modal="true"
            aria-labelledby="address-form-title"
          >
            <header className="flex items-start justify-between gap-3 border-b border-outline-soft/40 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">
                  {editingAddress ? 'Adres düzenleme' : 'Yeni adres'}
                </p>
                <h2 id="address-form-title" className="mt-1 font-display text-2xl font-semibold text-primary">
                  {editingAddress ? editingAddress.title : 'Adres ekle'}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {editingAddress ? 'Adres bilgilerini güncelleyin.' : 'Teslimat için kullanılacak adres bilgilerini ekleyin.'}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-outline-soft/60 px-3 py-2 text-sm font-semibold text-muted hover:border-primary hover:text-primary"
                onClick={closeSheet}
                aria-label="Kapat"
              >
                Kapat
              </button>
            </header>

            <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={editingAddress ? update : create}>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                {editingAddress ? addressFields(editForm, setEditForm) : addressFields(form, setForm)}
              </div>
              <footer className="flex gap-3 border-t border-outline-soft/40 px-6 py-4">
                <button
                  type="button"
                  className="flex-1 rounded-full border border-outline-soft/70 px-5 py-3 text-sm font-semibold text-muted hover:border-primary hover:text-primary"
                  onClick={closeSheet}
                >
                  Vazgeç
                </button>
                <button className="stitch-button flex-1 disabled:opacity-60" disabled={busy} type="submit">
                  {busy ? 'Kaydediliyor...' : editingAddress ? 'Güncelle' : 'Kaydet'}
                </button>
              </footer>
            </form>
          </aside>
        </>
      ) : null}
    </div>
  );
}
