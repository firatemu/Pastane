import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ProductStatus, StockReservationStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import { ERROR_CODES } from '../common/constants/error-codes';
import { istanbulDay, timeFallsWithinWindow } from '../common/utils/time-window.util';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class StockReservationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async reserve(
    tx: Prisma.TransactionClient,
    orderId: string,
    items: Array<{ orderItemId: string; productId: string; quantity: number }>,
    at: Date,
    expiresAt: Date,
  ): Promise<void> {
    for (const item of items) {
      const product = await tx.product.findFirst({
        where: { id: item.productId, deletedAt: null, status: ProductStatus.ACTIVE },
      });
      if (!product) throw new AppException(ERROR_CODES.PRODUCT_NOT_ACTIVE, 'Product not active', HttpStatus.BAD_REQUEST);

      const localDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(at);
      const date = istanbulDay(localDate);
      const hhmm = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).format(at);
      const entries = await tx.stockEntry.findMany({
        where: { productId: item.productId, date, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
      const entry = entries.find((candidate) => timeFallsWithinWindow(hhmm, candidate.availableFrom ?? undefined, candidate.availableTo ?? undefined));
      if (!entry) throw new AppException(ERROR_CODES.STOCK_WINDOW_NOT_ACTIVE, 'Stock window not active', HttpStatus.BAD_REQUEST);

      const active = await tx.stockReservation.aggregate({
        where: { stockEntryId: entry.id, status: StockReservationStatus.ACTIVE, expiresAt: { gt: new Date() } },
        _sum: { quantity: true },
      });
      const available = entry.quantity - (active._sum.quantity ?? 0);
      if (available < item.quantity) throw new AppException(ERROR_CODES.INSUFFICIENT_STOCK, 'Insufficient stock', HttpStatus.BAD_REQUEST);

      await tx.stockReservation.create({
        data: { orderId, orderItemId: item.orderItemId, productId: item.productId, stockEntryId: entry.id, quantity: item.quantity, expiresAt },
      });
    }
  }

  async expireOrder(orderId: string, tx = this.prisma) {
    return tx.stockReservation.updateMany({
      where: { orderId, status: StockReservationStatus.ACTIVE },
      data: { status: StockReservationStatus.EXPIRED, releasedAt: new Date() },
    });
  }
}
