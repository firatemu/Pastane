import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DeliveryStatus, OrderStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ERROR_CODES } from '../common/constants/error-codes';
import { AppException } from '../common/exceptions/app.exception';
import { normalizePagination } from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderStatusService } from '../orders/order-status.service';
import { DeliveryStatusService } from './delivery-status.service';
import type { FailDeliveryDto } from './dto/fail-delivery.dto';
import type { QueryMyDeliveriesDto } from './dto/query-my-deliveries.dto';

@Injectable()
export class DeliveriesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(DeliveryStatusService) private readonly statuses: DeliveryStatusService,
    @Inject(OrderStatusService) private readonly orderStatuses: OrderStatusService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(LoyaltyService) private readonly loyalty: LoyaltyService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async mine(userId: string, q: QueryMyDeliveriesDto) {
    const { page, limit } = normalizePagination(q.page, q.limit);
    const where: Prisma.DeliveryWhereInput = {
      courier: { userId, deletedAt: null },
      order: { deletedAt: null },
      ...(q.status ? { status: q.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.delivery.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ updatedAt: 'asc' }, { createdAt: 'asc' }],
        include: this.listInclude(),
      }),
      this.prisma.delivery.count({ where }),
    ]);
    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMine(userId: string, id: string) {
    const d = await this.prisma.delivery.findFirst({
      where: { id, courier: { userId, deletedAt: null }, order: { deletedAt: null } },
      include: this.detailInclude(),
    });
    if (!d) throw new AppException(ERROR_CODES.DELIVERY_NOT_FOUND, 'Delivery not found', HttpStatus.NOT_FOUND);
    return d;
  }

  async pickUp(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const d = await this.findMineForMutation(tx, userId, id);
      this.statuses.assert(d.status, DeliveryStatus.PICKED_UP);
      this.orderStatuses.assert(d.order.status, OrderStatus.OUT_FOR_DELIVERY);
      const updated = await tx.delivery.update({
        where: { id },
        data: { status: DeliveryStatus.PICKED_UP, pickedUpAt: new Date() },
      });
      await tx.order.update({ where: { id: d.orderId }, data: { status: OrderStatus.OUT_FOR_DELIVERY } });
      await tx.orderStatusHistory.create({
        data: { orderId: d.orderId, status: OrderStatus.OUT_FOR_DELIVERY },
      });
      await this.audit.log(
        {
          actorId: userId,
          action: 'deliveries.pickUp',
          entityType: 'Delivery',
          entityId: id,
          newValues: { status: DeliveryStatus.PICKED_UP, orderStatus: OrderStatus.OUT_FOR_DELIVERY },
        },
        tx,
      );
      await this.notifications.createOrderStatusNotification(
        tx,
        d.order.userId,
        d.order.orderNumber,
        OrderStatus.OUT_FOR_DELIVERY,
      );
      return updated;
    });
  }

  async deliver(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const d = await this.findMineForMutation(tx, userId, id);
      this.statuses.assert(d.status, DeliveryStatus.DELIVERED);
      this.orderStatuses.assert(d.order.status, OrderStatus.DELIVERED);
      const updated = await tx.delivery.update({
        where: { id },
        data: { status: DeliveryStatus.DELIVERED, deliveredAt: new Date() },
      });
      await tx.order.update({ where: { id: d.orderId }, data: { status: OrderStatus.DELIVERED } });
      await tx.orderStatusHistory.create({ data: { orderId: d.orderId, status: OrderStatus.DELIVERED } });
      await this.loyalty.earnForDeliveredOrder(d.orderId, tx, userId);
      await this.audit.log(
        {
          actorId: userId,
          action: 'deliveries.deliver',
          entityType: 'Delivery',
          entityId: id,
          newValues: { status: DeliveryStatus.DELIVERED, orderStatus: OrderStatus.DELIVERED },
        },
        tx,
      );
      await this.notifications.createOrderStatusNotification(
        tx,
        d.order.userId,
        d.order.orderNumber,
        OrderStatus.DELIVERED,
      );
      return updated;
    });
  }

  async fail(userId: string, id: string, dto: FailDeliveryDto) {
    const reason = dto.reason.trim();
    return this.prisma.$transaction(async (tx) => {
      const d = await this.findMineForMutation(tx, userId, id);
      this.statuses.assert(d.status, DeliveryStatus.FAILED);
      this.orderStatuses.assert(d.order.status, OrderStatus.DELIVERY_FAILED);
      const updated = await tx.delivery.update({
        where: { id },
        data: { status: DeliveryStatus.FAILED, failedReason: reason },
      });
      await tx.order.update({ where: { id: d.orderId }, data: { status: OrderStatus.DELIVERY_FAILED } });
      await tx.orderStatusHistory.create({
        data: { orderId: d.orderId, status: OrderStatus.DELIVERY_FAILED, note: reason },
      });
      await this.audit.log(
        {
          actorId: userId,
          action: 'deliveries.fail',
          entityType: 'Delivery',
          entityId: id,
          newValues: {
            status: DeliveryStatus.FAILED,
            reason,
            orderStatus: OrderStatus.DELIVERY_FAILED,
          },
        },
        tx,
      );
      await this.notifications.createOrderStatusNotification(
        tx,
        d.order.userId,
        d.order.orderNumber,
        'Teslim edilemedi',
      );
      return updated;
    });
  }

  private async findMineForMutation(tx: Prisma.TransactionClient, userId: string, id: string) {
    const d = await tx.delivery.findFirst({
      where: { id, courier: { userId, deletedAt: null }, order: { deletedAt: null } },
      include: { order: { select: { id: true, status: true, userId: true, orderNumber: true } } },
    });
    if (!d) throw new AppException(ERROR_CODES.DELIVERY_NOT_FOUND, 'Delivery not found', HttpStatus.NOT_FOUND);
    return d;
  }

  /** Courier list: compact order summary + item count + latest payment status (no card/provider data). */
  private listInclude() {
    return {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          scheduledAt: true,
          createdAt: true,
          deliveryType: true,
          grandTotal: true,
          addressSnapshot: true,
          user: { select: { id: true, firstName: true, lastName: true, phone: true } },
          _count: { select: { items: true } },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { status: true },
          },
        },
      },
    } as const;
  }

  /** Courier detail: full order scalars + relations; latest payment status for operational context. */
  private detailInclude() {
    return {
      order: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phone: true } },
          items: { include: { options: true } },
          statusHistory: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { status: true },
          },
        },
      },
    } as const;
  }
}
