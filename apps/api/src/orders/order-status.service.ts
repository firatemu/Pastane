import { HttpStatus, Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import { ERROR_CODES } from '../common/constants/error-codes';

/**
 * Admin/manual order status changes. Ödeme başarılı olunca CONFIRMED geçişi ödeme servisinde yapılır;
 * bu yüzden PAYMENT_PENDING → CONFIRMED burada listede yoktur.
 */
@Injectable()
export class OrderStatusService {
  private readonly transitions: Record<OrderStatus, OrderStatus[]> = {
    NEW: [OrderStatus.PAYMENT_PENDING],
    PAYMENT_PENDING: [OrderStatus.CANCELLED],
    CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    PREPARING: [OrderStatus.READY],
    READY: [OrderStatus.ASSIGNED_TO_COURIER, OrderStatus.DELIVERED],
    ASSIGNED_TO_COURIER: [OrderStatus.OUT_FOR_DELIVERY],
    OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.DELIVERY_FAILED],
    DELIVERY_FAILED: [OrderStatus.CANCELLED, OrderStatus.READY],
    DELIVERED: [OrderStatus.CANCELLED],
    CANCELLED: [],
  };

  assert(from: OrderStatus, to: OrderStatus): void {
    if (!this.transitions[from].includes(to)) {
      throw new AppException(ERROR_CODES.ORDER_STATUS_TRANSITION_INVALID, 'Invalid order status transition', HttpStatus.BAD_REQUEST);
    }
  }
}
