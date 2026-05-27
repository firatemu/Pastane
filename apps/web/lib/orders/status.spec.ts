import { describe, expect, it } from 'vitest';
import {
  CANCELLABLE_STATUSES,
  CUSTOMER_TIMELINE,
  deliveryStatusLabel,
  paymentStatusLabel,
  statusLabel,
  timelineStatus,
} from './status';

describe('customer order status labels', () => {
  it('maps order and payment statuses to customer-friendly Turkish labels', () => {
    expect(statusLabel('OUT_FOR_DELIVERY')).toBe('Yolda');
    expect(paymentStatusLabel('SUCCESS')).toBe('Ödeme alındı');
    expect(deliveryStatusLabel('OUT_FOR_DELIVERY')).toBe('Yolda');
  });
  it('allows cancellation only for early customer-safe states', () => {
    expect(CANCELLABLE_STATUSES.has('PAYMENT_PENDING')).toBe(true);
    expect(CANCELLABLE_STATUSES.has('DELIVERED')).toBe(false);
  });
  it('removes ready from the visible customer timeline but keeps legacy rows readable', () => {
    expect(CUSTOMER_TIMELINE).not.toContain('READY');
    expect(timelineStatus('READY')).toBe('PREPARING');
  });
});
