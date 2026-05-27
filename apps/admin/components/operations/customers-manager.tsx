'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { BakeryStatCard } from '../dashboard/bakery-stat-card';
import { ErrorState, LoadingState } from '../shared/async-state';
import { Field } from '../shared/form-field';
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSelectClass,
  adminTextareaClass,
} from '../shared/admin-form-controls';
import { adminFetch, adminFetchEnvelope } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import {
  customerAdminUpdateSchema,
  loyaltyAdjustSchema,
  sendNotificationSchema,
} from '../../lib/operations/schemas';
import type {
  CustomerDetail,
  CustomerListRow,
  CustomersListMeta,
} from '../../lib/operations/types';
import { can } from '../../lib/permissions/can';

type ProfileForm = z.infer<typeof customerAdminUpdateSchema>;
type LoyaltyForm = z.infer<typeof loyaltyAdjustSchema>;
type NotificationForm = z.infer<typeof sendNotificationSchema>;

const PAGE_SIZE = 12;

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Pasif',
  BANNED: 'Yasaklı',
};

const NOTIFICATION_CHANNELS = [
  { value: 'IN_APP', label: 'Uygulama içi' },
  { value: 'PUSH', label: 'Push' },
  { value: 'SMS', label: 'SMS' },
  { value: 'EMAIL', label: 'E-posta' },
] as const;

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('tr-TR');
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('tr-TR');
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function fullName(row: { firstName: string; lastName: string }): string {
  return `${row.firstName} ${row.lastName}`.trim();
}

export function CustomersManager({
  permissions,
}: {
  permissions: string[];
}): React.JSX.Element {
  const [rows, setRows] = useState<CustomerListRow[]>([]);
  const [meta, setMeta] = useState<CustomersListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const canUpdateCustomers = can(permissions, ['customers.update']);
  const canIncreaseLoyalty = can(permissions, ['loyalty.manageSettings']);
  const canDecreaseLoyalty = can(permissions, ['loyalty.redeem']) || canIncreaseLoyalty;
  const canSendNotifications = can(permissions, ['notifications.send']);

  const [loyaltyMode, setLoyaltyMode] = useState<'adjust' | 'redeem'>(
    canIncreaseLoyalty ? 'adjust' : 'redeem',
  );

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(customerAdminUpdateSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      status: 'ACTIVE',
    },
  });

  const loyaltyForm = useForm<LoyaltyForm>({
    resolver: zodResolver(loyaltyAdjustSchema) as Resolver<LoyaltyForm>,
    defaultValues: {
      points: 1,
      userId: '',
      qrCode: '',
      note: '',
    },
  });

  const notificationForm = useForm<NotificationForm>({
    resolver: zodResolver(sendNotificationSchema),
    defaultValues: {
      userId: '',
      type: 'IN_APP',
      title: '',
      body: '',
      metadataJson: '',
    },
  });

  async function loadCustomers(): Promise<void> {
    setLoading(true);
    try {
      setListError(null);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status', statusFilter);

      const response = await adminFetchEnvelope<CustomerListRow[]>(
        `/users/customers?${params.toString()}`,
      );
      const nextRows = response.data;
      const nextMeta = response.meta as CustomersListMeta;

      setRows(nextRows);
      setMeta(nextMeta);
      setSelectedId((current) => {
        if (current && nextRows.some((row) => row.id === current)) return current;
        return nextRows[0]?.id ?? null;
      });
    } catch (caught) {
      setListError(adminMessageFromUnknownError(caught, 'Müşteri listesi yüklenemedi.'));
      setRows([]);
      setMeta(null);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(customerId: string): Promise<void> {
    setDetailLoading(true);
    try {
      setDetailError(null);
      const payload = await adminFetch<CustomerDetail>(`/users/customers/${customerId}`);
      setDetail(payload);
      profileForm.reset({
        firstName: payload.profile.firstName,
        lastName: payload.profile.lastName,
        phone: payload.profile.phone,
        email: payload.profile.email ?? '',
        status: payload.profile.status as 'ACTIVE' | 'INACTIVE' | 'BANNED',
      });
      loyaltyForm.reset({
        points: 1,
        userId: payload.profile.id,
        qrCode: '',
        note: '',
      });
      notificationForm.reset({
        userId: payload.profile.id,
        type: 'IN_APP',
        title: '',
        body: '',
        metadataJson: '',
      });
    } catch (caught) {
      setDetail(null);
      setDetailError(adminMessageFromUnknownError(caught, 'Müşteri detayı yüklenemedi.'));
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadCustomers();
  }, [page, search, statusFilter]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    void loadDetail(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (canIncreaseLoyalty) return;
    setLoyaltyMode('redeem');
  }, [canIncreaseLoyalty]);

  async function submitProfile(values: ProfileForm): Promise<void> {
    if (!detail) return;
    try {
      setInfo(null);
      setDetailError(null);
      await adminFetch(`/users/customers/${detail.profile.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          email: values.email,
          status: values.status,
        }),
      });
      setInfo('Müşteri profili güncellendi.');
      await Promise.all([loadCustomers(), loadDetail(detail.profile.id)]);
    } catch (caught) {
      setDetailError(adminMessageFromUnknownError(caught, 'Müşteri profili güncellenemedi.'));
    }
  }

  async function submitLoyalty(values: LoyaltyForm): Promise<void> {
    if (!detail) return;
    const path = loyaltyMode === 'adjust' ? '/loyalty/adjust' : '/loyalty/redeem';
    try {
      setInfo(null);
      setDetailError(null);
      await adminFetch(path, {
        method: 'POST',
        body: JSON.stringify({
          userId: detail.profile.id,
          points: values.points,
          note: values.note || undefined,
        }),
      });
      setInfo(
        loyaltyMode === 'adjust'
          ? 'Sadakat puanı müşteri hesabına eklendi.'
          : 'Sadakat puanı müşteri hesabından düşüldü.',
      );
      loyaltyForm.reset({
        points: 1,
        userId: detail.profile.id,
        qrCode: '',
        note: '',
      });
      await Promise.all([loadCustomers(), loadDetail(detail.profile.id)]);
    } catch (caught) {
      setDetailError(adminMessageFromUnknownError(caught, 'Sadakat işlemi tamamlanamadı.'));
    }
  }

  async function submitNotification(values: NotificationForm): Promise<void> {
    if (!detail) return;
    try {
      setInfo(null);
      setDetailError(null);
      let metadata: Record<string, unknown> | undefined;
      if (values.metadataJson?.trim()) {
        metadata = JSON.parse(values.metadataJson) as Record<string, unknown>;
      }

      await adminFetch('/notifications/send', {
        method: 'POST',
        body: JSON.stringify({
          userId: detail.profile.id,
          type: values.type,
          title: values.title,
          body: values.body,
          metadata,
        }),
      });
      setInfo('Bildirim kuyruğa alındı.');
      notificationForm.reset({
        userId: detail.profile.id,
        type: 'IN_APP',
        title: '',
        body: '',
        metadataJson: '',
      });
      await loadDetail(detail.profile.id);
    } catch (caught) {
      setDetailError(adminMessageFromUnknownError(caught, 'Bildirim gönderilemedi.'));
    }
  }

  const selectedCustomer = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [rows, selectedId],
  );

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-on-surface">
          Müşteri Yönetimi
        </h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-on-surface-variant">
          Kayıt bilgileri, sipariş geçmişi, adresler, sadakat, bildirimler ve yorumları tek operasyon ekranında
          yönetin. Kritik mutasyonlardan sonra ekran her zaman backend doğrulamalı veriyi yeniden çeker.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BakeryStatCard
          size="minimal"
          label="Toplam Müşteri"
          value={String(meta?.total ?? rows.length)}
          iconGoogle="groups"
          accent="surface"
        />
        <BakeryStatCard
          size="minimal"
          label="Aktif Müşteri"
          value={String(meta?.summary.activeCount ?? 0)}
          iconGoogle="verified_user"
          accent="tertiary"
        />
        <BakeryStatCard
          size="minimal"
          label="Sipariş Veren"
          value={String(meta?.summary.withOrdersCount ?? 0)}
          iconGoogle="shopping_bag"
          accent="secondary"
        />
        <BakeryStatCard
          size="minimal"
          label="Sadakat Hesabı"
          value={String(meta?.summary.loyaltyCount ?? 0)}
          iconGoogle="card_membership"
          accent="alert"
        />
      </div>

      {listError ? <ErrorState message={listError} /> : null}
      {info ? (
        <div className="rounded-2xl border border-tertiary/25 bg-tertiary-container px-4 py-3 text-sm font-semibold text-tertiary">
          {info}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-4 shadow-bakery">
          <div>
            <h2 className="font-display text-xl font-semibold text-on-surface">Müşteri Listesi</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Segment, iletişim ve sipariş yoğunluğuna göre müşteri seçin.
            </p>
          </div>

          <div className="grid gap-3">
            <label className="block space-y-1.5 text-sm font-medium text-on-surface">
              <span className="text-on-surface-variant">Ara</span>
              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
                  search
                </span>
                <input
                  className={`${adminInputClass} pl-10`}
                  placeholder="Ad, telefon, e-posta…"
                  value={search}
                  onChange={(event) => {
                    setPage(1);
                    setSearch(event.target.value);
                  }}
                />
              </div>
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-on-surface">
              <span className="text-on-surface-variant">Durum</span>
              <select
                className={adminSelectClass}
                value={statusFilter}
                onChange={(event) => {
                  setPage(1);
                  setStatusFilter(event.target.value);
                }}
              >
                <option value="">Tümü</option>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Pasif</option>
                <option value="BANNED">Yasaklı</option>
              </select>
            </label>
          </div>

          {loading ? (
            <LoadingState label="Müşteriler yükleniyor…" />
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-outline-variant/45 bg-surface-container-low px-5 py-10 text-center">
              <span className="material-symbols-outlined text-[42px] text-outline">search_off</span>
              <p className="mt-3 font-display text-lg font-semibold text-on-surface">Müşteri bulunamadı</p>
              <p className="mt-2 text-sm text-on-surface-variant">
                Filtreleri değiştirin veya aramayı temizleyin.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {rows.map((row) => {
                  const selected = selectedId === row.id;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                        selected
                          ? 'border-secondary bg-secondary-container/40'
                          : 'border-outline-variant/35 bg-surface-container-low hover:bg-surface-container'
                      }`}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-on-surface">
                              {fullName(row)}
                            </p>
                            <StatusBadge status={row.status} />
                          </div>
                          <p className="mt-1 truncate text-xs text-on-surface-variant">
                            {row.phone} {row.email ? `· ${row.email}` : ''}
                          </p>
                        </div>
                        <span className="rounded-full bg-surface-container-lowest px-2.5 py-1 text-[11px] font-semibold text-secondary">
                          {row.metrics.orderCount} sipariş
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-on-surface-variant sm:grid-cols-2">
                        <MetricPill
                          icon="payments"
                          label={`Harcama ${row.metrics.lifetimeSpent} TL`}
                        />
                        <MetricPill
                          icon="schedule"
                          label={`Son sipariş ${formatDate(row.metrics.lastOrderAt)}`}
                        />
                        <MetricPill
                          icon="map"
                          label={
                            row.defaultAddress
                              ? `${row.defaultAddress.district}, ${row.defaultAddress.city}`
                              : 'Adres yok'
                          }
                        />
                        <MetricPill
                          icon="card_membership"
                          label={
                            row.loyalty
                              ? `${row.loyalty.points} puan`
                              : 'Sadakat hesabı yok'
                          }
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-outline-variant/25 pt-3 text-sm text-on-surface-variant">
                <span>
                  Sayfa {meta?.page ?? page} / {Math.max(meta?.totalPages ?? 1, 1)}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={adminSecondaryButtonClass}
                    onClick={() => setPage((current) => Math.max(current - 1, 1))}
                    disabled={(meta?.page ?? page) <= 1}
                  >
                    Önceki
                  </button>
                  <button
                    type="button"
                    className={adminSecondaryButtonClass}
                    onClick={() =>
                      setPage((current) =>
                        Math.min(current + 1, Math.max(meta?.totalPages ?? current, current)),
                      )
                    }
                    disabled={(meta?.page ?? page) >= Math.max(meta?.totalPages ?? 1, 1)}
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            </>
          )}
        </aside>

        <div className="space-y-5">
          {detailLoading ? (
            <LoadingState label="Müşteri 360 yükleniyor…" />
          ) : detailError ? (
            <ErrorState message={detailError} />
          ) : !detail || !selectedCustomer ? (
            <div className="rounded-card border border-dashed border-outline-variant/45 bg-surface-container-lowest px-8 py-16 text-center shadow-bakery">
              <span className="material-symbols-outlined text-[48px] text-outline">group</span>
              <p className="mt-4 font-display text-lg font-semibold text-on-surface">
                Bir müşteri seçin
              </p>
              <p className="mt-2 text-sm text-on-surface-variant">
                Liste üzerinden seçtiğiniz müşterinin 360 derece operasyon görünümü burada açılır.
              </p>
            </div>
          ) : (
            <>
              <section className="rounded-card border border-outline-variant/35 bg-surface-container-lowest p-6 shadow-bakery">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-2xl font-semibold text-on-surface">
                        {fullName(detail.profile)}
                      </h2>
                      <StatusBadge status={detail.profile.status} />
                    </div>
                    <p className="mt-2 text-sm text-on-surface-variant">
                      Kayıt: {formatDateTime(detail.profile.createdAt)} · Son güncelleme:{' '}
                      {formatDateTime(detail.profile.updatedAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-on-surface-variant">
                      <MetricPill icon="call" label={detail.profile.phone} />
                      <MetricPill
                        icon={detail.profile.isPhoneVerified ? 'verified' : 'pending'}
                        label={
                          detail.profile.isPhoneVerified
                            ? 'Telefon doğrulandı'
                            : 'Telefon doğrulanmadı'
                        }
                      />
                      {detail.profile.email ? (
                        <MetricPill icon="mail" label={detail.profile.email} />
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <p className="rounded-full border border-outline-variant/35 bg-surface-container px-3 py-2 text-xs font-medium text-on-surface-variant">
                      Müşteri hesapları bu ekrandan kaldırılamaz.
                    </p>
                    <Link href={`/orders`} className={adminSecondaryButtonClass}>
                      <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                      Sipariş merkezi
                    </Link>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryTile
                    icon="shopping_bag"
                    label="Toplam sipariş"
                    value={detail.summary.totalOrders}
                  />
                  <SummaryTile
                    icon="done_all"
                    label="Teslim edilen"
                    value={detail.summary.deliveredOrders}
                  />
                  <SummaryTile
                    icon="payments"
                    label="Yaşam boyu harcama"
                    value={`${detail.summary.lifetimeSpent} TL`}
                  />
                  <SummaryTile
                    icon="notifications_active"
                    label="Okunmamış bildirim"
                    value={detail.summary.unreadNotificationsCount}
                  />
                </div>
              </section>

              <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-5">
                  <SectionCard
                    title="Profil ve Hesap Durumu"
                    description="Temel kayıt bilgisini ve müşterinin erişim durumunu güncelleyin."
                  >
                    {canUpdateCustomers ? (
                      <form
                        className="grid gap-4 md:grid-cols-2"
                        onSubmit={profileForm.handleSubmit(submitProfile)}
                      >
                        <Field label="Ad" error={profileForm.formState.errors.firstName?.message}>
                          <input className={adminInputClass} {...profileForm.register('firstName')} />
                        </Field>
                        <Field label="Soyad" error={profileForm.formState.errors.lastName?.message}>
                          <input className={adminInputClass} {...profileForm.register('lastName')} />
                        </Field>
                        <Field label="Telefon" error={profileForm.formState.errors.phone?.message}>
                          <input className={adminInputClass} {...profileForm.register('phone')} />
                        </Field>
                        <Field label="E-posta" error={profileForm.formState.errors.email?.message}>
                          <input className={adminInputClass} type="email" {...profileForm.register('email')} />
                        </Field>
                        <Field label="Durum" error={profileForm.formState.errors.status?.message}>
                          <select className={adminSelectClass} {...profileForm.register('status')}>
                            <option value="ACTIVE">Aktif</option>
                            <option value="INACTIVE">Pasif</option>
                            <option value="BANNED">Yasaklı</option>
                          </select>
                        </Field>
                        <div className="flex items-end">
                          <button
                            type="submit"
                            className={`${adminPrimaryButtonClass} w-full`}
                            disabled={profileForm.formState.isSubmitting}
                          >
                            <span className="material-symbols-outlined text-[18px]">save</span>
                            Kaydet
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="text-sm text-on-surface-variant">
                        Bu müşteri profilini güncelleme yetkiniz yok.
                      </p>
                    )}
                  </SectionCard>

                  <SectionCard
                    title="Adresler"
                    description="Teslimat operasyonunun kullandığı kayıtlı müşteri adresleri."
                  >
                    <div className="space-y-3">
                      {detail.addresses.length === 0 ? (
                        <p className="text-sm text-on-surface-variant">Kayıtlı adres bulunmuyor.</p>
                      ) : (
                        detail.addresses.map((address) => (
                          <div
                            key={address.id}
                            className="rounded-2xl border border-outline-variant/35 bg-surface-container-low px-4 py-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-on-surface">{address.title}</p>
                              {address.isDefault ? (
                                <span className="rounded-full bg-secondary-container px-2.5 py-1 text-[11px] font-semibold text-secondary">
                                  Varsayılan
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                              {address.fullAddress}
                            </p>
                            <p className="mt-2 text-xs text-on-surface-variant">
                              {address.district}, {address.city}
                              {address.neighborhood ? ` · ${address.neighborhood}` : ''}
                              {address.directions ? ` · Not: ${address.directions}` : ''}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Sipariş Geçmişi"
                    description="Sipariş düzenlemek yerine detay ekranına yönlenin; bu alan bir operasyon hub olarak çalışır."
                  >
                    <div className="space-y-3">
                      {detail.recentOrders.length === 0 ? (
                        <p className="text-sm text-on-surface-variant">Henüz sipariş bulunmuyor.</p>
                      ) : (
                        detail.recentOrders.map((order) => (
                          <div
                            key={order.id}
                            className="rounded-2xl border border-outline-variant/35 bg-surface-container-low px-4 py-4"
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-on-surface">
                                    {order.orderNumber}
                                  </p>
                                  <span className="rounded-full bg-surface-container-lowest px-2.5 py-1 text-[11px] font-semibold text-secondary">
                                    {order.status}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm text-on-surface-variant">
                                  {formatDateTime(order.createdAt)} · {order.deliveryType} ·{' '}
                                  {order._count.items} kalem
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-secondary">
                                  {order.grandTotal} TL
                                </span>
                                <Link
                                  href={`/orders/${order.id}`}
                                  className={adminSecondaryButtonClass}
                                >
                                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                  Sipariş detayı
                                </Link>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-on-surface-variant">
                              {order.payments.map((payment) => (
                                <MetricPill
                                  key={payment.id}
                                  icon="payments"
                                  label={`${payment.status} · ${payment.amount} TL`}
                                />
                              ))}
                              {order.delivery?.courier ? (
                                <MetricPill
                                  icon="electric_bike"
                                  label={`${order.delivery.courier.user.firstName} ${order.delivery.courier.user.lastName}`}
                                />
                              ) : null}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </SectionCard>
                </div>

                <div className="space-y-5">
                  <SectionCard
                    title="Sadakat"
                    description="Mevcut puan durumu ve son hareketler. Uygun yetki varsa ekleme/çıkarma yapın."
                  >
                    <div className="rounded-2xl border border-outline-variant/35 bg-surface-container-low px-4 py-4">
                      <p className="text-sm text-on-surface-variant">Bakiye</p>
                      <p className="mt-2 font-display text-3xl font-semibold text-on-surface">
                        {detail.loyaltyAccount?.points ?? 0}
                      </p>
                      <p className="mt-2 text-xs text-on-surface-variant">
                        QR: {detail.loyaltyAccount?.qrCode ?? 'Henüz oluşturulmadı'}
                      </p>
                    </div>

                    {canIncreaseLoyalty || canDecreaseLoyalty ? (
                      <form
                        className="space-y-4 rounded-2xl border border-outline-variant/35 bg-surface-container-low px-4 py-4"
                        onSubmit={loyaltyForm.handleSubmit(submitLoyalty)}
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="İşlem tipi">
                            <select
                              className={adminSelectClass}
                              value={loyaltyMode}
                              onChange={(event) =>
                                setLoyaltyMode(event.target.value as 'adjust' | 'redeem')
                              }
                            >
                              {canIncreaseLoyalty ? <option value="adjust">Puan ekle</option> : null}
                              {canDecreaseLoyalty ? <option value="redeem">Puan düş</option> : null}
                            </select>
                          </Field>
                          <Field label="Puan" error={loyaltyForm.formState.errors.points?.message}>
                            <input
                              type="number"
                              className={adminInputClass}
                              {...loyaltyForm.register('points', { valueAsNumber: true })}
                            />
                          </Field>
                        </div>
                        <Field label="Not" error={loyaltyForm.formState.errors.note?.message}>
                          <textarea
                            className={adminTextareaClass}
                            rows={3}
                            {...loyaltyForm.register('note')}
                          />
                        </Field>
                        <button
                          type="submit"
                          className={`${adminPrimaryButtonClass} w-full`}
                          disabled={loyaltyForm.formState.isSubmitting}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {loyaltyMode === 'adjust' ? 'add_card' : 'remove_circle'}
                          </span>
                          {loyaltyMode === 'adjust' ? 'Puan ekle' : 'Puan düş'}
                        </button>
                      </form>
                    ) : null}

                    <div className="space-y-2">
                      {detail.loyaltyAccount?.movements?.length ? (
                        detail.loyaltyAccount.movements.map((movement) => (
                          <div
                            key={movement.id}
                            className="rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-on-surface">{movement.type}</span>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  movement.points >= 0
                                    ? 'bg-tertiary-container text-tertiary'
                                    : 'bg-error-container text-error'
                                }`}
                              >
                                {movement.points > 0 ? `+${movement.points}` : movement.points}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-on-surface-variant">
                              Bakiye sonrası: {movement.balanceAfter} · {formatDateTime(movement.createdAt)}
                            </p>
                            {movement.note ? (
                              <p className="mt-2 text-sm text-on-surface-variant">{movement.note}</p>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-on-surface-variant">Son sadakat hareketi bulunmuyor.</p>
                      )}
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Bildirimler"
                    description="Geçmiş gönderimleri inceleyin ve hedefli bildirim gönderin."
                  >
                    {canSendNotifications ? (
                      <form
                        className="space-y-4 rounded-2xl border border-outline-variant/35 bg-surface-container-low px-4 py-4"
                        onSubmit={notificationForm.handleSubmit(submitNotification)}
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Kanal" error={notificationForm.formState.errors.type?.message}>
                            <select className={adminSelectClass} {...notificationForm.register('type')}>
                              {NOTIFICATION_CHANNELS.map((channel) => (
                                <option key={channel.value} value={channel.value}>
                                  {channel.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Başlık" error={notificationForm.formState.errors.title?.message}>
                            <input className={adminInputClass} {...notificationForm.register('title')} />
                          </Field>
                        </div>
                        <Field label="Mesaj" error={notificationForm.formState.errors.body?.message}>
                          <textarea
                            className={adminTextareaClass}
                            rows={4}
                            {...notificationForm.register('body')}
                          />
                        </Field>
                        <Field
                          label="Metadata JSON"
                          error={
                            (notificationForm.formState.errors as Record<string, { message?: string }>)
                              .metadataJson?.message
                          }
                        >
                          <textarea
                            className={`${adminTextareaClass} font-mono text-sm`}
                            rows={3}
                            {...notificationForm.register('metadataJson')}
                          />
                        </Field>
                        <button
                          type="submit"
                          className={`${adminPrimaryButtonClass} w-full`}
                          disabled={notificationForm.formState.isSubmitting}
                        >
                          <span className="material-symbols-outlined text-[18px]">send</span>
                          Bildirimi gönder
                        </button>
                      </form>
                    ) : null}

                    <div className="space-y-2">
                      {detail.notifications.length === 0 ? (
                        <p className="text-sm text-on-surface-variant">Gönderilmiş bildirim bulunmuyor.</p>
                      ) : (
                        detail.notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className="rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-on-surface">{notification.title}</p>
                              <span className="rounded-full bg-surface-container-lowest px-2.5 py-1 text-[11px] font-semibold text-secondary">
                                {notification.type}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-on-surface-variant">
                              {notification.body}
                            </p>
                            <p className="mt-2 text-xs text-on-surface-variant">
                              {formatDateTime(notification.createdAt)} ·{' '}
                              {notification.readAt ? 'Okundu' : 'Okunmadı'}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Yorumlar"
                    description="Müşterinin bıraktığı ürün yorumları ve moderasyon durumları."
                  >
                    <div className="space-y-2">
                      {detail.reviews.length === 0 ? (
                        <p className="text-sm text-on-surface-variant">Yorum bulunmuyor.</p>
                      ) : (
                        detail.reviews.map((review) => (
                          <div
                            key={review.id}
                            className="rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-on-surface">{review.product.name}</p>
                              <span className="rounded-full bg-surface-container-lowest px-2.5 py-1 text-[11px] font-semibold text-secondary">
                                {review.status}
                              </span>
                              <span className="text-xs text-on-surface-variant">
                                {review.rating}/5
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-on-surface-variant">
                              {review.comment || 'Yalnızca puan verilmiş.'}
                            </p>
                            <p className="mt-2 text-xs text-on-surface-variant">
                              {formatDateTime(review.createdAt)} · Sipariş kalemi: {review.orderItem.productNameSnapshot}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </SectionCard>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

    </section>
  );
}

function SectionCard({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description: string;
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <section className="rounded-card border border-outline-variant/35 bg-surface-container-lowest p-5 shadow-bakery">
      <div className="mb-4">
        <h3 className="font-display text-xl font-semibold text-on-surface">{title}</h3>
        <p className="mt-1 text-sm text-on-surface-variant">{description}</p>
      </div>
      {children}
    </section>
  );
}

function SummaryTile({
  icon,
  label,
  value,
}: Readonly<{ icon: string; label: string; value: string | number }>): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-outline-variant/35 bg-surface-container-low px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-on-surface-variant">{label}</span>
        <span className="material-symbols-outlined text-[20px] text-secondary">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: Readonly<{ status: string }>): React.JSX.Element {
  const className =
    status === 'ACTIVE'
      ? 'border-tertiary/25 bg-tertiary-container text-tertiary'
      : status === 'INACTIVE'
        ? 'border-outline-variant/35 bg-surface-container text-on-surface-variant'
        : 'border-error/25 bg-error-container text-error';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${className}`}>
      {statusLabel(status)}
    </span>
  );
}

function MetricPill({
  icon,
  label,
}: Readonly<{ icon: string; label: string }>): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant/35 bg-surface-container-lowest px-2.5 py-1 text-[11px] font-medium text-on-surface-variant">
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
      {label}
    </span>
  );
}
