import { HttpStatus, Injectable } from '@nestjs/common';
import { DeliveryStatus } from '@prisma/client';
import { ERROR_CODES } from '../common/constants/error-codes';
import { AppException } from '../common/exceptions/app.exception';
@Injectable() export class DeliveryStatusService {
  private readonly transitions: Record<DeliveryStatus, DeliveryStatus[]> = {
    ASSIGNED: [DeliveryStatus.PICKED_UP],
    PICKED_UP: [DeliveryStatus.OUT_FOR_DELIVERY, DeliveryStatus.DELIVERED, DeliveryStatus.FAILED],
    OUT_FOR_DELIVERY: [DeliveryStatus.DELIVERED, DeliveryStatus.FAILED],
    DELIVERED: [],
    FAILED: [],
  };
  assert(from: DeliveryStatus, to: DeliveryStatus): void { if (!this.transitions[from].includes(to)) throw new AppException(ERROR_CODES.DELIVERY_STATUS_TRANSITION_INVALID, 'Invalid delivery status transition', HttpStatus.BAD_REQUEST); }
}
