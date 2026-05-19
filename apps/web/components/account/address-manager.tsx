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

  function addressFields(current: AddressForm, setCurrent: (value: AddressForm) => void): React.JSX.Element {
    return (
      <div className="mt-4 space-y-3 text-sm">
        <input
          className="w-full rounded-2xl border px-4 py-3"
          placeholder="Başlık"
          value={current.title}
          onChange={(e) => setCurrent({ ...current, title: e.target.value })}
          required
        />
        <input
          className="w-full rounded-2xl border px-4 py-3"
          placeholder="İl"
          value={current.city}
          onChange={(e) => setCurrent({ ...current, city: e.target.value })}
          required
        />
        <input
          className="w-full rounded-2xl border px-4 py-3"
          placeholder="İlçe"
          value={current.district}
          onChange={(e) => setCurrent({ ...current, district: e.target.value })}
          required
        />
        <input
          className="w-full rounded-2xl border px-4 py-3"
          placeholder="Mahalle"
          value={current.neighborhood}
          onChange={(e) => setCurrent({ ...current, neighborhood: e.target.value })}
        />
        <textarea
          className="min-h-24 w-full rounded-2xl border px-4 py-3"
          placeholder="Açık adres"
          value={current.fullAddress}
          onChange={(e) => setCurrent({ ...current, fullAddress: e.target.value })}
          required
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            className="rounded-2xl border px-3 py-3"
            placeholder="Bina"
            value={current.building}
            onChange={(e) => setCurrent({ ...current, building: e.target.value })}
          />
          <input
            className="rounded-2xl border px-3 py-3"
            placeholder="Kat"
            value={current.floor}
            onChange={(e) => setCurrent({ ...current, floor: e.target.value })}
          />
          <input
            className="rounded-2xl border px-3 py-3"
            placeholder="Daire"
            value={current.apartment}
            onChange={(e) => setCurrent({ ...current, apartment: e.target.value })}
          />
        </div>
        <textarea
          className="min-h-20 w-full rounded-2xl border px-4 py-3"
          placeholder="Adres tarifi"
          value={current.directions}
          onChange={(e) => setCurrent({ ...current, directions: e.target.value })}
        />
        <div className="space-y-1">
          <p className="text-xs font-medium text-stone-600">Haritadan teslim noktası seçin</p>
          <AddressMapPicker
            latitude={current.latitude}
            longitude={current.longitude}
            onCoordinatesChange={({ latitude, longitude, mapAddress }) =>
              setCurrent({ ...current, latitude, longitude, mapAddress })
            }
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={current.isDefault}
            onChange={(e) => setCurrent({ ...current, isDefault: e.target.checked })}
          />{' '}
          Varsayılan adres yap
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-[2rem] border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm text-stone-800">
          {message}
        </p>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        {!addresses.length ? (
          <div className="rounded-[2rem] border border-dashed border-amber-300 bg-white p-6 text-center text-stone-600">
            Kayıtlı adresiniz yok.
          </div>
        ) : (
          addresses.map((address) => (
            <article className="rounded-[2rem] border border-amber-200/70 bg-white p-5 shadow-sm" key={address.id}>
              {editingId === address.id ? (
                <form onSubmit={update}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold">Adresi düzenle</h2>
                    <button
                      className="text-sm text-stone-600"
                      disabled={busy}
                      onClick={() => setEditingId(null)}
                      type="button"
                    >
                      Vazgeç
                    </button>
                  </div>
                  {addressFields(editForm, setEditForm)}
                  <button
                    className="mt-4 rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
                    disabled={busy}
                    type="submit"
                  >
                    Güncelle
                  </button>
                </form>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">
                      {address.title}{' '}
                      {address.isDefault ? (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">
                          Varsayılan
                        </span>
                      ) : null}
                    </h2>
                    <p
                      className={
                        hasStoredCoordinates(address)
                          ? 'mt-2 text-xs text-green-700'
                          : 'mt-2 text-xs text-amber-800'
                      }
                    >
                      {hasStoredCoordinates(address) ? 'Harita konumu seçildi' : 'Harita konumu eksik'}
                    </p>
                    <p className="mt-2 text-sm text-stone-600">{address.fullAddress}</p>
                    <p className="mt-1 text-sm text-stone-500">
                      {address.neighborhood ? `${address.neighborhood} · ` : ''}
                      {address.district} / {address.city}
                    </p>
                    {address.building || address.floor || address.apartment ? (
                      <p className="mt-1 text-sm text-stone-500">
                        Bina {address.building ?? '-'} · Kat {address.floor ?? '-'} · Daire{' '}
                        {address.apartment ?? '-'}
                      </p>
                    ) : null}
                    {address.directions ? (
                      <p className="mt-1 text-sm text-stone-500">Tarif: {address.directions}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-full border px-3 py-2 text-xs"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(address.id);
                        setEditForm(formFromAddress(address));
                      }}
                      type="button"
                    >
                      Düzenle
                    </button>
                    {!address.isDefault ? (
                      <button
                        className="rounded-full border px-3 py-2 text-xs"
                        disabled={busy}
                        onClick={() => void setDefault(address.id)}
                        type="button"
                      >
                        Varsayılan yap
                      </button>
                    ) : null}
                    <button
                      className="rounded-full border border-red-200 px-3 py-2 text-xs text-red-700"
                      disabled={busy}
                      onClick={() => void remove(address.id)}
                      type="button"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))
        )}
      </section>
      <form className="rounded-[2rem] border border-amber-200/70 bg-white p-5 shadow-sm" onSubmit={create}>
        <h2 className="text-lg font-semibold">Yeni adres</h2>
        {addressFields(form, setForm)}
        <button
          className="mt-4 w-full rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
          disabled={busy}
          type="submit"
        >
          Adresi kaydet
        </button>
      </form>
      </div>
    </div>
  );
}
