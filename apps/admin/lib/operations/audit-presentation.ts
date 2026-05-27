import { STATUS_LABELS } from './status';
import type { AuditLogRow } from './types';

export type AuditTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface AuditChange {
  key: string;
  label: string;
  previousValue?: string;
  nextValue?: string;
}

export interface AuditPresentation {
  title: string;
  description: string;
  tone: AuditTone;
  toneLabel: string;
  entityLabel: string;
  entityReference: string;
  actorLabel: string;
  actorDetail: string;
  changes: AuditChange[];
  extraChangeCount: number;
}

export const AUDIT_TONE_STYLES: Record<AuditTone, string> = {
  neutral: 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant',
  info: 'border-secondary/20 bg-secondary-container/70 text-secondary',
  success: 'border-tertiary/20 bg-tertiary-container/70 text-tertiary',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-error/20 bg-error-container/70 text-error',
};

const ENTITY_LABELS: Record<string, string> = {
  Banner: 'Banner',
  Campaign: 'Kampanya',
  Courier: 'Kurye',
  Delivery: 'Teslimat',
  LoyaltyAccount: 'Sadakat hesabı',
  LoyaltySetting: 'Sadakat ayarı',
  Notification: 'Bildirim',
  Order: 'Sipariş',
  Payment: 'Ödeme',
  Product: 'Ürün',
  Review: 'Yorum',
  Setting: 'Ayar',
};

const ACTION_TITLES: Record<string, string> = {
  'banners.create': 'Banner oluşturuldu',
  'banners.delete': 'Banner yayından kaldırıldı',
  'banners.reorder': 'Banner sırası güncellendi',
  'banners.restore': 'Banner geri alındı',
  'banners.update': 'Banner güncellendi',
  'campaigns.create': 'Kampanya oluşturuldu',
  'campaigns.delete': 'Kampanya pasifleştirildi',
  'campaigns.update': 'Kampanya güncellendi',
  'couriers.create': 'Kurye oluşturuldu',
  'couriers.restore': 'Kurye yeniden aktifleştirildi',
  'couriers.softDelete': 'Kurye pasifleştirildi',
  'couriers.update': 'Kurye güncellendi',
  'deliveries.deliver': 'Teslimat tamamlandı',
  'deliveries.fail': 'Teslimat başarısız oldu',
  'deliveries.pickup': 'Kurye paketi teslim aldı',
  'loyalty.adjust': 'Sadakat puanı elle güncellendi',
  'loyalty.earn': 'Sadakat puanı kazanıldı',
  'loyalty.redeem': 'Sadakat puanı kullanıldı',
  'loyalty.reverse': 'Sadakat puanı geri alındı',
  'loyalty.settings.update': 'Sadakat ayarı güncellendi',
  'notifications.enqueue': 'Bildirim gönderim sırasına alındı',
  'orders.assignCourier': 'Siparişe kurye atandı',
  'orders.cancel': 'Sipariş iptal edildi',
  'orders.updateStatus': 'Sipariş durumu güncellendi',
  'payment.callback.failed': 'Ödeme bildirimi işlenemedi',
  'payment.callback.success': 'Ödeme bildirimi işlendi',
  'payment.iyzico.checkout.failed': 'Iyzico ile ödeme tamamlanamadı',
  'payment.timeout': 'Ödeme zaman aşımına uğradı',
  'products.create': 'Ürün oluşturuldu',
  'products.delete': 'Ürün yayından kaldırıldı',
  'products.update': 'Ürün güncellendi',
  'reviews.approve': 'Yorum onaylandı',
  'reviews.reject': 'Yorum reddedildi',
  'settings.create': 'Ayar oluşturuldu',
  'settings.update': 'Ayar güncellendi',
};

const FIELD_LABELS: Record<string, string> = {
  balanceAfter: 'Yeni bakiye',
  courierId: 'Kurye',
  deletedAt: 'Silinme zamanı',
  deliveryType: 'Teslimat tipi',
  description: 'Açıklama',
  earnRate: 'Kazanım oranı',
  email: 'E-posta',
  endDate: 'Bitiş',
  ids: 'Kayıtlar',
  isActive: 'Aktiflik',
  key: 'Ayar anahtarı',
  minimumRedeem: 'Minimum kullanım',
  name: 'Ad',
  note: 'Not',
  phone: 'Telefon',
  pointValue: 'Puan değeri',
  points: 'Puan',
  providerStatus: 'Sağlayıcı durumu',
  reason: 'Gerekçe',
  reassignment: 'Yeniden atama',
  reversedPoints: 'Geri alınan puan',
  slug: 'Kısa ad',
  startDate: 'Başlangıç',
  status: 'Durum',
  title: 'Başlık',
  type: 'Tip',
  value: 'Değer',
  vehicle: 'Araç',
};

const VALUE_LABELS: Record<string, string> = {
  ...STATUS_LABELS,
  ACTIVE: 'Aktif',
  APPROVED: 'Onaylandı',
  ASSIGNED: 'Atandı',
  BANNED: 'Yasaklı',
  CASH_ON_DELIVERY: 'Kapıda ödeme',
  CARD: 'Kart',
  DELIVERED: 'Teslim edildi',
  DELIVERY_FAILED: 'Teslim edilemedi',
  FAILED: 'Başarısız',
  failure: 'Başarısız',
  HOME_DELIVERY: 'Adrese teslim',
  INACTIVE: 'Pasif',
  OUT_OF_STOCK: 'Stokta yok',
  PASSIVE: 'Pasif',
  PICKED_UP: 'Teslim alındı',
  PICKUP: 'Mağazadan teslim',
  REJECTED: 'Reddedildi',
  SUCCESS: 'Başarılı',
  success: 'Başarılı',
  TIMEOUT: 'Zaman aşımı',
};

const TONE_LABELS: Record<AuditTone, string> = {
  neutral: 'Kayıt',
  info: 'Bilgi',
  success: 'Başarılı',
  warning: 'Dikkat',
  danger: 'Kritik',
};

const FIELD_PRIORITY = [
  'status',
  'providerStatus',
  'name',
  'title',
  'key',
  'reason',
  'note',
  'courierId',
  'points',
  'balanceAfter',
  'reversedPoints',
  'type',
  'value',
];

const REFERENCE_FIELDS = ['name', 'title', 'key', 'slug', 'type'];

export function getAuditPresentation(row: AuditLogRow): AuditPresentation {
  const title = ACTION_TITLES[row.action] ?? buildFallbackTitle(row.action, row.entityType);
  const changes = buildAuditChanges(row.oldValues, row.newValues);
  const entityLabel = getEntityLabel(row.entityType);
  const entityReference = getEntityReference(row.entityType, row.oldValues, row.newValues);
  const tone = inferAuditTone(row.action, row.oldValues, row.newValues);
  const actorLabel = row.actorId ? 'Kullanıcı' : 'Sistem';
  const actorDetail = row.actorId
    ? 'Oturum açmış kullanıcı tarafından yapıldı'
    : 'Otomatik veya arka plan süreci tarafından yapıldı';

  return {
    title,
    description: buildDescription(entityLabel, entityReference, changes, row.actorId),
    tone,
    toneLabel: TONE_LABELS[tone],
    entityLabel,
    entityReference,
    actorLabel,
    actorDetail,
    changes: changes.slice(0, 3),
    extraChangeCount: Math.max(changes.length - 3, 0),
  };
}

export function formatAuditDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Geçersiz tarih';
  }

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatAuditRelativeTime(value: string, now: Date = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Zaman bilinmiyor';
  }

  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' });

  if (absSeconds < 60) {
    return formatter.format(diffSeconds, 'second');
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (absSeconds < 60 * 60) {
    return formatter.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffSeconds / (60 * 60));
  if (absSeconds < 60 * 60 * 24) {
    return formatter.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffSeconds / (60 * 60 * 24));
  if (absSeconds < 60 * 60 * 24 * 30) {
    return formatter.format(diffDays, 'day');
  }

  const diffMonths = Math.round(diffDays / 30);
  if (absSeconds < 60 * 60 * 24 * 365) {
    return formatter.format(diffMonths, 'month');
  }

  const diffYears = Math.round(diffDays / 365);
  return formatter.format(diffYears, 'year');
}

export function stringifyAuditPayload(value: unknown): string {
  const sanitized = sanitizeAuditPayload(value);

  if (sanitized === undefined) {
    return 'Belirtilmedi';
  }

  try {
    return JSON.stringify(sanitized, null, 2);
  } catch {
    return String(sanitized);
  }
}

function buildAuditChanges(oldValues: unknown, newValues: unknown): AuditChange[] {
  const oldRecord = toRecord(oldValues);
  const newRecord = toRecord(newValues);

  if (!oldRecord && !newRecord) {
    if (oldValues === undefined && newValues === undefined) {
      return [];
    }

    if (isSameValue(oldValues, newValues)) {
      return [];
    }

    return [
      withOptionalValues({
        key: 'value',
        label: getFieldLabel('value'),
        previousValue: oldValues === undefined ? undefined : formatAuditValue(oldValues, 'value'),
        nextValue: newValues === undefined ? undefined : formatAuditValue(newValues, 'value'),
      }),
    ];
  }

  return Array.from(
    new Set([...Object.keys(oldRecord ?? {}), ...Object.keys(newRecord ?? {})]),
  )
    .filter((key) => !isSameValue(oldRecord?.[key], newRecord?.[key]))
    .sort(compareKeysByPriority)
    .map((key) =>
      withOptionalValues({
        key,
        label: getFieldLabel(key),
        previousValue:
          oldRecord && Object.prototype.hasOwnProperty.call(oldRecord, key)
            ? formatAuditValue(oldRecord[key], key)
            : undefined,
        nextValue:
          newRecord && Object.prototype.hasOwnProperty.call(newRecord, key)
            ? formatAuditValue(newRecord[key], key)
            : undefined,
      }),
    );
}

function compareKeysByPriority(left: string, right: string): number {
  const leftIndex = FIELD_PRIORITY.indexOf(left);
  const rightIndex = FIELD_PRIORITY.indexOf(right);

  if (leftIndex === -1 && rightIndex === -1) {
    return left.localeCompare(right, 'tr');
  }

  if (leftIndex === -1) {
    return 1;
  }

  if (rightIndex === -1) {
    return -1;
  }

  return leftIndex - rightIndex;
}

function buildDescription(
  entityLabel: string,
  entityReference: string,
  changes: AuditChange[],
  actorId: string | null,
): string {
  const subject = `${entityLabel} • ${entityReference}`;
  const primaryChange = changes[0];

  if (primaryChange) {
    return `${subject}: ${formatInlineChange(primaryChange)}`;
  }

  return actorId ? `${subject}: kullanıcı tarafından işlendi.` : `${subject}: sistem tarafından işlendi.`;
}

function formatInlineChange(change: AuditChange): string {
  if (change.key === 'ids') {
    return `${change.label} seçimi güncellendi`;
  }

  if (change.key.endsWith('Id')) {
    if (change.previousValue && change.nextValue) {
      return `${change.label} bilgisi güncellendi`;
    }

    if (change.nextValue) {
      return `${change.label} bilgisi eklendi`;
    }

    if (change.previousValue) {
      return `${change.label} bilgisi kaldırıldı`;
    }
  }

  if (change.previousValue && change.nextValue) {
    return `${change.label}: ${change.previousValue} -> ${change.nextValue}`;
  }

  if (change.nextValue) {
    return `${change.label}: ${change.nextValue}`;
  }

  if (change.previousValue) {
    return `${change.label}: ${change.previousValue} (kaldırıldı)`;
  }

  return change.label;
}

function inferAuditTone(action: string, oldValues: unknown, newValues: unknown): AuditTone {
  const nextStatus = getStatusValue(newValues) ?? getStatusValue(oldValues);
  const normalizedAction = action.toLowerCase();

  if (
    normalizedAction.includes('failed') ||
    normalizedAction.includes('reject') ||
    normalizedAction.includes('timeout') ||
    nextStatus === 'FAILED' ||
    nextStatus === 'REJECTED' ||
    nextStatus === 'DELIVERY_FAILED' ||
    nextStatus === 'BANNED'
  ) {
    return 'danger';
  }

  if (
    normalizedAction.includes('cancel') ||
    normalizedAction.includes('delete') ||
    nextStatus === 'CANCELLED' ||
    nextStatus === 'INACTIVE'
  ) {
    return 'warning';
  }

  if (
    normalizedAction.includes('create') ||
    normalizedAction.includes('approve') ||
    normalizedAction.includes('success') ||
    normalizedAction.includes('deliver') ||
    nextStatus === 'SUCCESS' ||
    nextStatus === 'APPROVED' ||
    nextStatus === 'DELIVERED' ||
    nextStatus === 'ACTIVE' ||
    nextStatus === 'READY' ||
    nextStatus === 'CONFIRMED' ||
    nextStatus === 'PICKED_UP'
  ) {
    return 'success';
  }

  if (normalizedAction.includes('update') || normalizedAction.includes('assign')) {
    return 'info';
  }

  return 'neutral';
}

function getStatusValue(value: unknown): string | null {
  const record = toRecord(value);
  if (record && typeof record.status === 'string') {
    return record.status;
  }

  return null;
}

function getEntityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? humanizeToken(entityType);
}

function getEntityReference(entityType: string, oldValues: unknown, newValues: unknown): string {
  const reference = extractReference(newValues) ?? extractReference(oldValues);

  if (reference) {
    return reference;
  }

  return `İlgili ${getEntityLabel(entityType).toLocaleLowerCase('tr')} kaydı`;
}

function extractReference(value: unknown): string | null {
  const record = toRecord(value);
  if (!record) {
    return null;
  }

  for (const key of REFERENCE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return `${getFieldLabel(key)}: ${formatAuditValue(record[key], key)}`;
    }
  }

  return null;
}

function buildFallbackTitle(action: string, entityType: string): string {
  const parts = action.split('.');
  const verb = parts.at(-1) ?? action;
  const entityLabel = getEntityLabel(entityType);

  switch (verb) {
    case 'create':
      return `${entityLabel} oluşturuldu`;
    case 'update':
      return `${entityLabel} güncellendi`;
    case 'delete':
      return `${entityLabel} kaldırıldı`;
    case 'approve':
      return `${entityLabel} onaylandı`;
    case 'reject':
      return `${entityLabel} reddedildi`;
    case 'restore':
      return `${entityLabel} geri alındı`;
    default:
      return `${entityLabel}: ${humanizeToken(verb)}`;
  }
}

function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? humanizeToken(key);
}

function formatAuditValue(value: unknown, key: string): string {
  if (value === null) {
    return 'Boş';
  }

  if (value === undefined) {
    return 'Belirtilmedi';
  }

  if (typeof value === 'boolean') {
    return value ? 'Evet' : 'Hayır';
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  if (typeof value === 'string') {
    if (isIsoDateLike(value)) {
      return formatAuditDateTime(value);
    }

    if (key === 'status' || key.endsWith('Status') || looksLikeEnum(value)) {
      return VALUE_LABELS[value] ?? humanizeToken(value);
    }

    if (key.endsWith('Id')) {
      return getHiddenIdentifierLabel(key);
    }

    if (looksLikeInternalId(value)) {
      return 'Kimlik bilgisi gizlendi';
    }

    return value.length > 72 ? `${value.slice(0, 69)}...` : value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'Yok';
    }

    const scalarList = value.every(
      (item) =>
        item === null ||
        typeof item === 'string' ||
        typeof item === 'number' ||
        typeof item === 'boolean',
    );

    if (scalarList && value.length <= 3) {
      return value.map((item) => formatAuditValue(item, key)).join(', ');
    }

    return `${value.length} öğe`;
  }

  const record = toRecord(value);
  if (!record) {
    return String(value);
  }

  const entries = Object.entries(record);
  if (entries.length === 0) {
    return 'Boş nesne';
  }

  const preview = entries
    .slice(0, 2)
    .map(([childKey, childValue]) => `${getFieldLabel(childKey)}: ${formatAuditValue(childValue, childKey)}`)
    .join(', ');

  return entries.length > 2 ? `${preview} +${entries.length - 2}` : preview;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function looksLikeEnum(value: string): boolean {
  return /^[A-Z0-9_]+$/.test(value);
}

function looksLikeInternalId(value: string): boolean {
  return /^[a-z]+_[a-z0-9]{8,}$/i.test(value) || /^[a-f0-9-]{16,}$/i.test(value);
}

function isIsoDateLike(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value);
}

function humanizeToken(value: string): string {
  const spaced = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .trim()
    .toLocaleLowerCase('tr');

  return spaced.charAt(0).toLocaleUpperCase('tr') + spaced.slice(1);
}

function isSameValue(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }

  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function withOptionalValues(input: {
  key: string;
  label: string;
  previousValue: string | undefined;
  nextValue: string | undefined;
}): AuditChange {
  const change: AuditChange = {
    key: input.key,
    label: input.label,
  };

  if (input.previousValue !== undefined) {
    change.previousValue = input.previousValue;
  }

  if (input.nextValue !== undefined) {
    change.nextValue = input.nextValue;
  }

  return change;
}

function getHiddenIdentifierLabel(key: string): string {
  if (key === 'courierId') {
    return 'Kurye bilgisi gizlendi';
  }

  return 'Kimlik bilgisi gizlendi';
}

function sanitizeAuditPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditPayload(item));
  }

  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && looksLikeInternalId(value)) {
      return 'Kimlik bilgisi gizlendi';
    }

    return value;
  }

  const record = value as Record<string, unknown>;

  return Object.fromEntries(
    Object.entries(record).map(([key, innerValue]) => {
      if (key.endsWith('Id') || key === 'ids') {
        return [key, 'Kimlik bilgisi gizlendi'];
      }

      return [key, sanitizeAuditPayload(innerValue)];
    }),
  );
}
