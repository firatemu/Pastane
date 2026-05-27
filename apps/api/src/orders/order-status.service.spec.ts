import { OrderStatus } from '@prisma/client';
import { OrderStatusService } from './order-status.service';

describe('OrderStatusService', () => {
  const service = new OrderStatusService();
  it('does not treat payment pending to confirmed as a manual/admin transition', () => {
    expect(() => service.assert(OrderStatus.PAYMENT_PENDING, OrderStatus.CONFIRMED)).toThrow();
  });
  it('allows payment pending cancellation', () => {
    expect(() => service.assert(OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED)).not.toThrow();
  });
  it('allows delivering order cancellation post-delivery only', () => {
    expect(() => service.assert(OrderStatus.DELIVERED, OrderStatus.CANCELLED)).not.toThrow();
    expect(() => service.assert(OrderStatus.DELIVERED, OrderStatus.PREPARING)).toThrow();
  });
  it('rejects confirmed back to payment pending', () => {
    expect(() => service.assert(OrderStatus.CONFIRMED, OrderStatus.PAYMENT_PENDING)).toThrow();
  });
  it('allows out for delivery to delivery failed', () => {
    expect(() => service.assert(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERY_FAILED)).not.toThrow();
  });
  it('allows delivery failed to reassignment or cancellation', () => {
    expect(() => service.assert(OrderStatus.DELIVERY_FAILED, OrderStatus.ASSIGNED_TO_COURIER)).not.toThrow();
    expect(() => service.assert(OrderStatus.DELIVERY_FAILED, OrderStatus.CANCELLED)).not.toThrow();
    expect(() => service.assert(OrderStatus.DELIVERY_FAILED, OrderStatus.DELIVERED)).toThrow();
  });
  it('skips ready and allows preparing to move straight into handoff or pickup completion', () => {
    expect(() => service.assert(OrderStatus.PREPARING, OrderStatus.ASSIGNED_TO_COURIER)).not.toThrow();
    expect(() => service.assert(OrderStatus.PREPARING, OrderStatus.DELIVERED)).not.toThrow();
    expect(() => service.assert(OrderStatus.PREPARING, OrderStatus.READY)).toThrow();
  });
});
