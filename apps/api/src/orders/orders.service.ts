import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CourierStatus, DeliveryStatus, DeliveryType, OrderStatus, PaymentStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import { ERROR_CODES } from '../common/constants/error-codes';
import type { AuthUser } from '../common/types/auth-user.type';
import { money } from '../common/utils/money.util';
import { createOrderNumber, orderNumberDatePrefix } from '../common/utils/order-number.util';
import { normalizePagination } from '../common/utils/pagination.util';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QueuesService } from '../jobs/queues.service';
import { computeProductAvailability } from '../products/product-availability.util';
import type { AssignCourierDto } from './dto/assign-courier.dto';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { QueryOrdersDto } from './dto/query-orders.dto';
import type { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatusService } from './order-status.service';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrderStatusService) private readonly statuses: OrderStatusService,
    @Inject(QueuesService) private readonly queues: QueuesService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(LoyaltyService) private readonly loyalty: LoyaltyService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: { items: { include: { product: true, options: { include: { option: true } } } } },
      });
      if (!cart?.items.length) throw new AppException(ERROR_CODES.CART_EMPTY, 'Cart is empty', HttpStatus.BAD_REQUEST);

      for (const item of cart.items) {
        const availability = computeProductAvailability(item.product);
        if (!availability.isPurchasable) {
          throw new AppException(ERROR_CODES.PRODUCT_NOT_AVAILABLE_FOR_SALE, 'Product not available for sale', HttpStatus.BAD_REQUEST);
        }
      }

      let addressSnapshot: Prisma.InputJsonValue | undefined;
      let deliveryFee = money.of(0);
      if (dto.deliveryType === DeliveryType.HOME_DELIVERY) {
        if (!dto.addressId) throw new AppException(ERROR_CODES.ORDER_ADDRESS_REQUIRED, 'Address required', HttpStatus.BAD_REQUEST);
        const a = await tx.address.findFirst({ where: { id: dto.addressId, userId, deletedAt: null } });
        if (!a) throw new AppException(ERROR_CODES.ORDER_ADDRESS_REQUIRED, 'Address required', HttpStatus.BAD_REQUEST);
        const zone = await tx.deliveryZone.findFirst({ where: { name: { equals: a.district, mode: 'insensitive' }, deletedAt: null, isActive: true } });
        if (!zone) throw new AppException(ERROR_CODES.DELIVERY_ZONE_NOT_FOUND, 'Delivery zone not found for address', HttpStatus.BAD_REQUEST);
        addressSnapshot = Object.assign(
          { title: a.title, city: a.city, district: a.district, neighborhood: a.neighborhood, fullAddress: a.fullAddress, building: a.building, floor: a.floor, apartment: a.apartment, directions: a.directions },
          typeof a.latitude === 'number' && Number.isFinite(a.latitude) && typeof a.longitude === 'number' && Number.isFinite(a.longitude) ? { latitude: a.latitude, longitude: a.longitude } : {},
          typeof a.mapAddress === 'string' && a.mapAddress.trim().length ? { mapAddress: a.mapAddress.trim() } : {},
        ) as Prisma.InputJsonObject;
        deliveryFee = zone.deliveryFee;
      }
      if (dto.deliveryType === DeliveryType.PICKUP) {
        if (!dto.pickupStoreId) throw new AppException(ERROR_CODES.ORDER_PICKUP_STORE_REQUIRED, 'Pickup store required', HttpStatus.BAD_REQUEST);
        const s = await tx.store.findFirst({ where: { id: dto.pickupStoreId, deletedAt: null, isActive: true } });
        if (!s) throw new AppException(ERROR_CODES.ORDER_PICKUP_STORE_REQUIRED, 'Pickup store required', HttpStatus.BAD_REQUEST);
      }
      const account = await tx.loyaltyAccount.findUnique({ where: { userId } });
      if ((dto.loyaltyPointsUsed ?? 0) > (account?.points ?? 0)) throw new AppException(ERROR_CODES.INSUFFICIENT_LOYALTY_POINTS, 'Insufficient loyalty points', HttpStatus.BAD_REQUEST);
      const priced = cart.items.map((i) => {
        const optionTotal = money.add(...i.options.map(({ option }) => option.priceModifier));
        const unit = money.add(i.product.discountedPrice ?? i.product.price, optionTotal);
        return { cartItem: i, unit, total: money.multiply(unit, i.quantity) };
      });
      const subtotal = money.round(money.add(...priced.map((i) => i.total)));
      const setting = await tx.loyaltySetting.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
      const loyaltyDiscount = setting && dto.loyaltyPointsUsed ? money.round(money.multiply(setting.pointValue, dto.loyaltyPointsUsed)) : money.of(0);
      const grandTotal = money.round(money.subtract(money.add(subtotal, deliveryFee), loyaltyDiscount));
      const orderNumber = await this.nextOrderNumber(tx);
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          deliveryType: dto.deliveryType,
          addressSnapshot,
          pickupStoreId: dto.pickupStoreId,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
          subtotal,
          deliveryFee,
          loyaltyDiscount,
          loyaltyPointsUsed: dto.loyaltyPointsUsed ?? 0,
          grandTotal,
          note: dto.note,
          status: OrderStatus.PAYMENT_PENDING,
        },
      });
      for (const item of priced) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.cartItem.productId,
            productNameSnapshot: item.cartItem.product.name,
            unitPriceSnapshot: item.unit,
            quantity: item.cartItem.quantity,
            customNote: item.cartItem.customNote,
            options: {
              create: item.cartItem.options.map(({ optionId, option }) => ({
                optionId,
                optionNameSnapshot: option.name,
                priceModifierSnapshot: option.priceModifier,
              })),
            },
          },
        });
      }
      await tx.orderStatusHistory.create({ data: { orderId: order.id, status: OrderStatus.PAYMENT_PENDING } });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: { include: { options: true } }, statusHistory: true } });
    });
    return created;
  }

  async listAdmin(q: QueryOrdersDto) {
    const { page, limit } = normalizePagination(q.page, q.limit);
    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
      ...(q.status ? { status: q.status } : {}),
      ...(q.deliveryType ? { deliveryType: q.deliveryType } : {}),
      ...(q.paymentStatus ? { payments: { some: { status: q.paymentStatus } } } : {}),
      ...(q.assigned === true ? { delivery: { courierId: { not: null } } } : {}),
      ...(q.assigned === false ? { OR: [{ delivery: null }, { delivery: { courierId: null } }] } : {}),
      ...(q.startDate || q.endDate ? { createdAt: { ...(q.startDate ? { gte: new Date(q.startDate) } : {}), ...(q.endDate ? { lte: new Date(q.endDate) } : {}) } } : {}),
      ...(q.search ? { OR: [{ orderNumber: { contains: q.search, mode: 'insensitive' } }, { user: { firstName: { contains: q.search, mode: 'insensitive' } } }, { user: { lastName: { contains: q.search, mode: 'insensitive' } } }, { user: { phone: { contains: q.search } } }] } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [q.sortBy ?? 'createdAt']: q.sortOrder ?? 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phone: true } },
          payments: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true } },
          delivery: { include: { courier: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } } } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  mine(userId: string) {
    return this.prisma.order.findMany({
      where: { userId, deletedAt: null },
      include: {
        items: { include: { review: true, options: true, product: { select: { id: true, slug: true, name: true } } } },
        statusHistory: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getForUser(user: AuthUser, id: string) {
    const canViewAll = user.permissions.includes('orders.viewAll');
    const where: Prisma.OrderWhereInput = { id, deletedAt: null, ...(!canViewAll ? { userId: user.sub } : {}) };
    const o = await this.prisma.order.findFirst({ where, include: this.detailInclude() });
    if (!o) throw new AppException(ERROR_CODES.ORDER_NOT_FOUND, 'Order not found', HttpStatus.NOT_FOUND);
    return o;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, actor?: AuthUser) {
    const noteTrimmed = dto.note?.trim() ?? '';
    const cancelNoteMin = 5;
    return this.prisma.$transaction(async (tx) => {
      const o = await tx.order.findFirst({ where: { id, deletedAt: null } });
      if (!o) throw new AppException(ERROR_CODES.ORDER_NOT_FOUND, 'Order not found', HttpStatus.NOT_FOUND);
      if (dto.status === OrderStatus.CANCELLED && noteTrimmed.length < cancelNoteMin) {
        throw new AppException(ERROR_CODES.VALIDATION_FAILED, `İptal için en az ${cancelNoteMin} karakter nedeni yazın`, HttpStatus.BAD_REQUEST);
      }
      const unpaidPendingCancel = o.status === OrderStatus.PAYMENT_PENDING && dto.status === OrderStatus.CANCELLED;
      const paidCount = await tx.payment.count({ where: { orderId: id, status: PaymentStatus.SUCCESS } });
      if (!unpaidPendingCancel && !paidCount) {
        throw new AppException(ERROR_CODES.VALIDATION_FAILED, 'Ödemesi henüz alınmadığı için bu durumu seçemezsiniz. Ödeme bekleyen siparişlerde yalnızca iptal yapılabilir.', HttpStatus.BAD_REQUEST);
      }
      this.statuses.assert(o.status, dto.status);
      if (o.status === OrderStatus.DELIVERED && dto.status === OrderStatus.CANCELLED) {
        await this.loyalty.reverseEarnForDeliveredOrderIfAny(id, tx, actor?.sub, noteTrimmed);
      }
      if (o.status === OrderStatus.DELIVERY_FAILED && dto.status === OrderStatus.READY) {
        await tx.delivery.updateMany({
          where: { orderId: id },
          data: { status: DeliveryStatus.ASSIGNED, failedReason: null },
        });
      }
      const updated = await tx.order.update({ where: { id }, data: { status: dto.status } });
      await tx.orderStatusHistory.create({ data: { orderId: id, status: dto.status, note: noteTrimmed.length ? noteTrimmed : null } });
      await this.audit.log({ actorId: actor?.sub, action: 'orders.updateStatus', entityType: 'Order', entityId: id, oldValues: { status: o.status }, newValues: { status: dto.status, note: noteTrimmed || null } }, tx);
      if (dto.status === OrderStatus.DELIVERED) await this.loyalty.earnForDeliveredOrder(id, tx, actor?.sub);
      await this.notifications.createOrderStatusNotification(tx, o.userId, o.orderNumber, dto.status);
      return updated;
    });
  }

  async assignCourier(id: string, dto: AssignCourierDto, actor?: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id, deletedAt: null }, include: { delivery: true } });
      if (!order) throw new AppException(ERROR_CODES.ORDER_NOT_FOUND, 'Order not found', HttpStatus.NOT_FOUND);
      if (order.deliveryType !== DeliveryType.HOME_DELIVERY) throw new AppException(ERROR_CODES.ORDER_NOT_ASSIGNABLE, 'Pickup orders cannot be assigned', HttpStatus.BAD_REQUEST);
      if (order.status !== OrderStatus.READY && order.status !== OrderStatus.ASSIGNED_TO_COURIER) throw new AppException(ERROR_CODES.ORDER_NOT_ASSIGNABLE, 'Order is not ready for courier assignment', HttpStatus.BAD_REQUEST);
      const courier = await tx.courier.findFirst({ where: { id: dto.courierId, deletedAt: null, status: CourierStatus.ACTIVE } });
      if (!courier) throw new AppException(ERROR_CODES.COURIER_NOT_FOUND, 'Courier not found', HttpStatus.NOT_FOUND);
      if (order.status === OrderStatus.ASSIGNED_TO_COURIER) {
        const d = order.delivery;
        if (!d || d.status !== DeliveryStatus.ASSIGNED) throw new AppException(ERROR_CODES.ORDER_NOT_ASSIGNABLE, 'Courier can only be reassigned before the delivery has started', HttpStatus.BAD_REQUEST);
        if (d.courierId === courier.id) return { orderId: id, delivery: d };
        const updatedDelivery = await tx.delivery.update({ where: { orderId: id }, data: { courierId: courier.id, status: DeliveryStatus.ASSIGNED, failedReason: null } });
        await this.audit.log({ actorId: actor?.sub, action: 'orders.assignCourier', entityType: 'Order', entityId: id, oldValues: { courierId: d.courierId }, newValues: { courierId: courier.id, reassignment: true } }, tx);
        return { orderId: id, delivery: updatedDelivery };
      }
      this.statuses.assert(order.status, OrderStatus.ASSIGNED_TO_COURIER);
      const delivery = await tx.delivery.upsert({
        where: { orderId: id },
        update: { courierId: courier.id, status: DeliveryStatus.ASSIGNED, failedReason: null },
        create: { orderId: id, courierId: courier.id, status: DeliveryStatus.ASSIGNED },
      });
      await tx.order.update({ where: { id }, data: { status: OrderStatus.ASSIGNED_TO_COURIER } });
      await tx.orderStatusHistory.create({ data: { orderId: id, status: OrderStatus.ASSIGNED_TO_COURIER } });
      await this.audit.log({ actorId: actor?.sub, action: 'orders.assignCourier', entityType: 'Order', entityId: id, newValues: { courierId: courier.id, status: OrderStatus.ASSIGNED_TO_COURIER } }, tx);
      await this.notifications.createOrderStatusNotification(tx, order.userId, order.orderNumber, OrderStatus.ASSIGNED_TO_COURIER);
      return { orderId: id, delivery };
    });
  }

  async cancel(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const o = await tx.order.findFirst({ where: { id, userId, deletedAt: null } });
      if (!o) throw new AppException(ERROR_CODES.ORDER_NOT_FOUND, 'Order not found', HttpStatus.NOT_FOUND);
      this.statuses.assert(o.status, OrderStatus.CANCELLED);
      const order = await tx.order.update({ where: { id }, data: { status: OrderStatus.CANCELLED } });
      await tx.orderStatusHistory.create({ data: { orderId: id, status: OrderStatus.CANCELLED } });
      await this.audit.log({ actorId: userId, action: 'orders.cancel', entityType: 'Order', entityId: id, newValues: { status: OrderStatus.CANCELLED } }, tx);
      await this.notifications.createOrderStatusNotification(tx, o.userId, o.orderNumber, OrderStatus.CANCELLED);
      return order;
    });
  }

  private detailInclude() {
    return {
      user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      items: { include: { options: true, review: true, product: { select: { id: true, slug: true, name: true } } } },
      statusHistory: true,
      payments: true,
      pickupStore: true,
      delivery: { include: { courier: { include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } } } } },
    } as const;
  }

  private async nextOrderNumber(tx: Prisma.TransactionClient, now = new Date()): Promise<string> {
    const prefix = orderNumberDatePrefix(now);
    const latest = await tx.order.findMany({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
      take: 100,
    });
    const maxSequence = latest.reduce((max, { orderNumber }) => {
      const match = orderNumber.match(new RegExp(`^${prefix}(\\d{3})$`));
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    return createOrderNumber(maxSequence + 1, now);
  }
}
