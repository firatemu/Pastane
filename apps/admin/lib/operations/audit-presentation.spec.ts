import { describe, expect, it } from 'vitest';
import {
  formatAuditDateTime,
  formatAuditRelativeTime,
  getAuditPresentation,
  stringifyAuditPayload,
} from './audit-presentation';
import type { AuditLogRow } from './types';

describe('getAuditPresentation', () => {
  it('turns status updates into readable summaries', () => {
    const row: AuditLogRow = {
      id: 'audit_1',
      createdAt: '2026-05-26T12:15:00.000Z',
      action: 'orders.updateStatus',
      entityType: 'Order',
      entityId: 'ord_1234567890abcdef',
      actorId: 'usr_1234567890abcdef',
      oldValues: { status: 'CONFIRMED' },
      newValues: { status: 'PREPARING', note: 'Hamur hazır' },
    };

    const presentation = getAuditPresentation(row);

    expect(presentation.title).toBe('Sipariş durumu güncellendi');
    expect(presentation.tone).toBe('info');
    expect(presentation.entityLabel).toBe('Sipariş');
    expect(presentation.entityReference).toBe('İlgili sipariş kaydı');
    expect(presentation.actorLabel).toBe('Kullanıcı');
    expect(presentation.actorDetail).toContain('Oturum açmış kullanıcı');
    expect(presentation.changes[0]).toMatchObject({
      key: 'status',
      label: 'Durum',
      previousValue: 'Onaylandı',
      nextValue: 'Hazırlanıyor',
    });
    expect(presentation.description).toContain('Durum: Onaylandı -> Hazırlanıyor');
  });

  it('flags failed payment callbacks as critical system events', () => {
    const row: AuditLogRow = {
      id: 'audit_2',
      createdAt: '2026-05-26T12:16:00.000Z',
      action: 'payment.callback.failed',
      entityType: 'Payment',
      entityId: 'pay_1234567890abcdef',
      actorId: null,
      newValues: { status: 'FAILED', providerStatus: 'failure' },
    };

    const presentation = getAuditPresentation(row);

    expect(presentation.title).toBe('Ödeme bildirimi işlenemedi');
    expect(presentation.tone).toBe('danger');
    expect(presentation.actorLabel).toBe('Sistem');
    expect(presentation.changes[0]).toMatchObject({
      key: 'status',
      nextValue: 'Başarısız',
    });
  });

  it('summarizes scalar setting values as a single value change', () => {
    const row: AuditLogRow = {
      id: 'audit_3',
      createdAt: '2026-05-26T12:18:00.000Z',
      action: 'settings.update',
      entityType: 'Setting',
      entityId: 'setting_1234567890',
      actorId: 'usr_222233334444',
      oldValues: false,
      newValues: true,
    };

    const presentation = getAuditPresentation(row);

    expect(presentation.changes).toEqual([
      {
        key: 'value',
        label: 'Değer',
        previousValue: 'Hayır',
        nextValue: 'Evet',
      },
    ]);
  });
});

describe('audit date formatting', () => {
  it('formats timestamps for Turkish admins', () => {
    expect(formatAuditDateTime('2026-05-26T12:15:00.000Z')).toContain('2026');
  });

  it('formats relative time against a provided clock', () => {
    const now = new Date('2026-05-26T12:20:00.000Z');
    expect(formatAuditRelativeTime('2026-05-26T12:15:00.000Z', now)).toContain('5 dakika');
  });
});

describe('stringifyAuditPayload', () => {
  it('masks internal identifiers in secondary metadata', () => {
    const output = stringifyAuditPayload({
      courierId: 'courier_1234567890abcdef',
      nested: { orderId: 'ord_1234567890abcdef' },
      ids: ['one', 'two'],
    });

    expect(output).not.toContain('courier_1234567890abcdef');
    expect(output).not.toContain('ord_1234567890abcdef');
    expect(output).toContain('Kimlik bilgisi gizlendi');
  });
});
